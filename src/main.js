/*
 * Copyright © 2024. Cloud Software Group, Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

Spotfire.initialize(async (mod) => {
    // Get the elements
    const contentElem = document.querySelector('.content'); // Content target
    const vizElem = document.querySelector(".visualization"); // Visualization target

    // Get the render context
    const context = mod.getRenderContext();

    // --------------------------------------------------------------------------------
    // SPOTFIRE DEFINITIONS

    let axes = {};
    let rows = null;
    let colorAxisType = null;
    let marking = null;
    let dark = false;
    let errorMessage = null;

    // --------------------------------------------------------------------------------
    // VIZ DATA AND CONFIG

    // Trellis collection to hold trellis panels
    let trellisCollection = new TrellisCollection(vizElem);

    // Marking handler
    const rectMarking = new RectMarking(vizElem);

    // --------------------------------------------------------------------------------
    // DATA FUNCTIONS

    // Deep clones an object, kind of
    let clone = function(aObject) {
        if (!aObject) return aObject;

        let v;
        let bObject = Array.isArray(aObject) ? [] : {};
        for (const k in aObject) {
            v = aObject[k];
            bObject[k] = (typeof v === "object") ? clone(v) : v;
        }

        return bObject;
    };

    // Test if the specified axis has an expression
    let axisHasExpression = function(name) {
        let axis = axes[name];
        if(axis != null && axis.parts != null && axis.parts.length > 0)
            return true;
        return false;
    };

    // Validate the mandatory axis has an expression
    let validateAxisExpression = function(name) {
        let axis = axes[name];
        if(axis != null && axis.parts != null && axis.parts.length > 0)
            return true;
        displayError(`Mandatory Axis ${name} requires an expression`);
        return false;
    };

    // Validate axes have required expressions
    let validateAxes = function() {
        let valid = true;
        valid = valid && validateAxisExpression("Layer Type");
        valid = valid && validateAxisExpression("X");
        valid = valid && validateAxisExpression("Y");
        
        return valid;
    };

    // Returns the color axis type, categorical or continuous
    let getColorAxisType = async function(dataView) {
        let axisName = "Color";
        let axis = null;

        try {
            // Test categorical
            axis = await dataView.categoricalAxis(axisName);
            if(axis != null) 
                return 'categorical';
        }
        catch(err) {
        }

        try {
            // Test continuous
            axis = await dataView.continuousAxis(axisName);
            if(axis != null) {
                return 'continuous';
            }
        }
        catch(err) {
        }

        return null;
    };

    // Return the color value for the row
    let getColorValue = function(row) {
        let axisName = "Color";
        if(axisHasExpression(axisName) == false) 
            return null;

        if(colorAxisType == 'categorical') {
            return row.categorical(axisName).formattedValue();
        }
        else {
            return row.continuous(axisName).value();
        }
    }

    // Determine if the canvas is dark
    let isDarkCanvas = function() {
        let isLight = Utility.hexIsLight(context.styling.general.backgroundColor);
        //if(context.styling.general.backgroundColor == '#2A2A2A') {
        if(isLight == false) {
            contentElem.classList.add('dark');
            return true;
        }
        else {
            contentElem.classList.remove('dark');
            return false;
        }
    };

    // --------------------------------------------------------------------------------
    // TRELLIS FUNCTIONS

    // Get the trellis item from the map for the specified value,
    //   if not found it will create one
    let getTrellisItem = function(trellisItemMap, trellisBy) {
        let thisTrellisItem = trellisItemMap[trellisBy];
        if(thisTrellisItem == null) {
            thisTrellisItem = {
                trellis: trellisBy,
                groupMap: {}
            };
            trellisItemMap[trellisBy] = thisTrellisItem;
        }

        return thisTrellisItem;
    };

    // Get the group item from the map for the specified value,
    //   if not found it will create one
    let getGroupItem = function(trellisItem, groupBy, layerType) {
        let thisGroupItem = trellisItem.groupMap[groupBy];
        if(thisGroupItem == null) {
            thisGroupItem = {
                group: groupBy,
                type: layerType,
                data: []
            }
            trellisItem.groupMap[groupBy] = thisGroupItem;
        }

        return thisGroupItem;
    };

    // --------------------------------------------------------------------------------
    // VIZ FUNCTIONS

    // Converts data rows into objects
    let processRows = async function() {
        if(rows == null) return false;

        // Get mod configuration
        let modConfig = vizConfiguration.getConfiguration();
        if(modConfig == null) return false;

        // Test for row count
        let rowLimit = modConfig.rowLimit != null && modConfig.rowLimit != null ? modConfig.rowLimit : 500;
        let rowCount = rows.length;
        if(rowCount > rowLimit) {
            let message = `
                Cannot render - too many rows (rowCount: ${rowCount}, limit: ${rowLimit}). <br/><br/>
                Filter to a smaller subset of values. Or cautiously increase the Row Count in mod configuration, bearing in mind this may cause Spotfire to become unresponsive.
            `;
            displayError(message);
            return;
        }

        // Validate axes have required expressions
        let valid = validateAxes();
        if(valid == false) return;

        // Create new trellis items map
        let trellisItemMap = {};

        // Iterate over rows, convert to objects, then apply to group data
        rows.forEach(function(row) {
            // Convert the row to an object
            let object = rowToObject(row);

            // Get the trellis item
            let thisTrellisItem = getTrellisItem(trellisItemMap, object.trellisBy);

            // Get the group from the trellis
            let thisGroupItem = getGroupItem(thisTrellisItem, object.groupBy, object.layerType);

            // Create a data item and add to group
            let data = {
                color: object.color,
                colorValue: object.colorValue,
                name: object.name,
                label: object.label,
                size: object.size,
                x: object.x,
                y: object.y, 
                row: row
            };
            
            thisGroupItem.data.push(data);
        });

        // Check trellis count doesn't exceed max
        let trellisLimit = modConfig.maxTrellisCount != null ? modConfig.maxTrellisCount : 5;
        let trellisCount = Object.keys(trellisItemMap).length;
        if(Object.keys(trellisItemMap).length > trellisLimit) {
            let message = `
                Cannot render - too many trellis panels (trellisCount: ${trellisCount}, limit: ${trellisLimit}). <br/><br/>
                Set Trellis By axis to a column with fewer values or filter to a smaller subset of values.
            `;
            displayError(message);
            return;
        }

        // Draw the viz with the specified trellis data
        drawViz(trellisItemMap);
    };

    // Converts a row to an object
    let rowToObject = function(row) {
        let object = {};

        object.color = axisHasExpression("Color") ? row.color().hexCode : null;
        object.colorValue = axisHasExpression("Color") ? getColorValue(row) : null;
        object.trellisBy = axisHasExpression("Trellis By") ? row.categorical("Trellis By").formattedValue() : null;
        object.groupBy = axisHasExpression("Group By") ? row.categorical("Group By").formattedValue() : null;
        object.layerType = row.categorical("Layer Type").formattedValue();
        object.name = axisHasExpression("Name") ? row.categorical("Name").formattedValue() : null;
        object.label = axisHasExpression("Label") ? row.categorical("Label").formattedValue() : null;
        object.size = axisHasExpression("Size") ? row.continuous("Size").value() : null;
        object.x = row.continuous("X").value();
        object.y = row.continuous("Y").value();

        return object;
    }

    // Draws the visualization
    let drawViz = async function(trellisItemMap) {  
        if(errorMessage != null) return;
        let modConfig = vizConfiguration.getConfiguration();

        // Set trellis direction and trellised flag
        trellisCollection.setDirection(modConfig.trellisDirection.toLowerCase());
        trellisCollection.setTrellised(axisHasExpression("Trellis By"));

        // Draw trellis panels (if required)
        trellisCollection.draw(Object.keys(trellisItemMap).length);

        // Create a configuration object
        let configuration = {
            colorAxisType: colorAxisType,
            marking: marking,
            dark: dark,
            hasColorData: axisHasExpression("Color"),
            showGridY: modConfig.diagram.showGridY,
            strokeDashArray: modConfig.diagram.strokeDashArray,
            strokeWidth: modConfig.diagram.strokeWidth
        };

        // Loop over the trellis data
        let index = 0;
        for(let key in trellisItemMap) {
            let thisTrellisItem = trellisItemMap[key];

            // Get panel
            let trellisPanel = trellisCollection.getPanel(index);

            // Set title
            trellisPanel.setTitle(thisTrellisItem.trellis);

            // Get canvas, groups, and diagram
            let canvasElem = trellisPanel.canvasElem;
            let diagram = trellisPanel.diagram;
            let groupMap = thisTrellisItem.groupMap;

            // If no diagram, make one now
            if(diagram == null) {
                let actions = {
                    showTooltip: showTooltip,
                    hideTooltip: hideTooltip,
                    clearAllMarking: clearAllMarking
                };
                diagram = new WellSpacingDiagram(canvasElem, actions);
                trellisPanel.diagram = diagram;
            }

            // Draw the diagram (this will draw or update depending on whether it exists)
            diagram.draw(groupMap, configuration);

            // Increment
            index++;
        }

        // Add rectangle marking handler
        rectMarking.addHandlersSelection(rectangularMarking);
    };

    // --------------------------------------------------------------------------------
    // ERRORS

    // Displays an error overlay
    let displayError = function(message) {
        errorMessage = message;
        vizElem.innerHTML = '';

        let errorElem = document.createElement('div');
        errorElem.classList.add('error-detail');
        vizElem.appendChild(errorElem);
        errorElem.innerHTML = message;

        // Destroy the trellis collection in case of error
        trellisCollection = new TrellisCollection(vizElem);
        //mod.controls.errorOverlay.show(message);
    };

    // Clears the error overlay
    let clearError = function() {
        errorMessage = null;
        let errorElem = vizElem.querySelector('.error-detail');
        if(errorElem != null) {
            vizElem.removeChild(errorElem);
        }
        //mod.controls.errorOverlay.hide();
    };

    // --------------------------------------------------------------------------------
    // HANDLERS

    // Display a new tooltip
    let showTooltip = function(object) {
        mod.controls.tooltip.show(object);
    }

    // Hide any visible tooltip
    let hideTooltip = function() {
        mod.controls.tooltip.hide();
    }

    // Set rectangular marking
    let rectangularMarking = function(selection) {
        if(vizConfiguration.active == true) return;

        // Its a selection
        if(selection.dragSelectComplete == true) {
            // Initialize selected rows array
            let selectedRows = [];

            // Get selected rows from each trellis panel
            for(let thisTrellisPanel of trellisCollection.trellisPanelArr) {
                if(thisTrellisPanel.diagram != null) {
                    let thisSelectedRows = thisTrellisPanel.diagram.rectangleSelection(selection);
                    selectedRows.push(thisSelectedRows);
                }
            }

            // Flatted the array of arrays
            selectedRows = selectedRows.flat();

            // If there are no selected rows, clear any current marking
            if(selectedRows.length == 0) {
                clearAllMarking();
            }
            // Otherwise mark the rows
            else {
                for(let thisRow of selectedRows) {
                    if(selection.ctrlKey == true)
                        thisRow.mark("Toggle");
                    else
                        thisRow.mark("Replace");
                }
            }
        }
    }

    // Clears marking in all trellis panels
    let clearAllMarking = function() {
        for(let thisRow of rows) {
            thisRow.mark('Subtract');
        }   
    }

    // --------------------------------------------------------------------------------
    // DATA EVENT HANDLER

    // Create a read function for data changes
    const reader = mod.createReader(
        mod.visualization.axis("Color"),
        mod.visualization.axis("Trellis By"),
        mod.visualization.axis("Group By"),
        mod.visualization.axis("Layer Type"),
        mod.visualization.axis("Name"),
        mod.visualization.axis("Label"),
        mod.visualization.axis("Size"),
        mod.visualization.axis("X"),
        mod.visualization.axis("Y"),
        mod.visualization.data(), 
        mod.windowSize()
    );
    reader.subscribe(render);

    async function render(colorView, trellisByView, groupByView, layerTypeView, nameView, labelView, sizeView, xView, yView,
            dataView, windowSize) {

        // Check for errors
        let errors = await dataView.getErrors();

        if(errors.length > 0) {
            displayError(errors);
            return;
        }
        clearError();

        // Copy the axes
        let axesArr = [colorView, trellisByView, groupByView, layerTypeView, nameView, labelView, sizeView, xView, yView];
        for(let thisAxis of axesArr) {
            axes[thisAxis.name] = thisAxis;
        }

        // Set marking flag based on the marking configuration, and enabled or disable rectMarking
        marking = await dataView.marking();
        rectMarking.setEnabled(marking != null);

        // Determine color axis type based on axis configuration in the dataView
        //   There seems to be a race condition with axis view, this is more accurate
        colorAxisType = await getColorAxisType(dataView);

        // Determine if it's a dark canvas
        dark = isDarkCanvas();

        // Get all rows and process
        rows = await dataView.allRows();

        // Process rows to objects and draw viz
        await processRows();

        // Signal render complete
        context.signalRenderComplete();
    }

    // --------------------------------------------------------------------------------
    // CONFIGURATION

    // Updates the configuration in the property store, this will trigger a draw
    let updateConfig = async function(configObj) {
        // Save the configuration
        mod.property("mod-config").set(JSON.stringify(configObj, null, 2));

        // Reprocess rows to objects and draw viz
        clearError();
        await processRows();

        // Signal render complete
        context.signalRenderComplete();
    };

    // Create a configuration handler
    const vizConfiguration = new VizConfiguration(contentElem, context.isEditing, updateConfig, axisHasExpression);
    //mod.property("mod-config").set("");

    // Initialize the configuration
    let modConfigStr = (await mod.property("mod-config")).value();
    vizConfiguration.setConfigurationStr(modConfigStr);
});

class TrellisCollection {
    // Creates a new trellis collection and appends elements to the specified vizElem
    constructor(vizElem) {
        let trellisCollectionElem = document.createElement('div');
        trellisCollectionElem.classList.add('trellis-collection');
        vizElem.appendChild(trellisCollectionElem);

        this.trellisCollectionElem = trellisCollectionElem;
        this.trellisPanelArr = [];
    }

    // Draws the specified number of panels
    draw(panelCount) {
        // If panel count matches, then it's good so just return
        if(panelCount == this.trellisPanelArr.length) return;

        // Calculate the current panel count compared to the target
        let delta = panelCount - this.trellisPanelArr.length;

        // If more panels required, make and append
        if(delta > 0) {
            for(let idx = 0; idx < delta; idx++) {
                let thisTrellisPanel = new TrellisPanel();
                this.trellisPanelArr.push(thisTrellisPanel);
                this.trellisCollectionElem.appendChild(thisTrellisPanel.trellisPanelElem);
            }
        }
        // If less panels required, remove and delete (will be gc)
        else if(delta < 0) {
            for(let idx = 0; idx < Math.abs(delta); idx++) {
                let thisTrellisPanel = this.trellisPanelArr.pop();
                this.trellisCollectionElem.removeChild(thisTrellisPanel.trellisPanelElem);
            }
        }

        //console.log(delta + " panelCount=" + panelCount + " len=" + this.trellisPanelArr.length);
    }

    // Sets the trellised flag as a class on the collection
    // This is so the panels will not look like they are trellised (even though they are)
    setTrellised(trellised) {
        let className = 'trellised';
        if(trellised == true)
            this.trellisCollectionElem.classList.add(className);
        else
            this.trellisCollectionElem.classList.remove(className);
    }

    // Sets the orientation of the trellis panels
    setDirection(trellisDirection) {
        let directions = ['columns', 'rows'];
        this.trellisCollectionElem.classList.remove(...directions);
        this.trellisCollectionElem.classList.add(trellisDirection);
    }

    // Returns the panel at the specified index
    getPanel(index) {
        return this.trellisPanelArr[index];
    }
}

class TrellisPanel {
    // Creates a new trellis panel and initializes elements, but doesn't append here
    constructor() {
        let trellisPanelElem = document.createElement('div');
        trellisPanelElem.classList.add('trellis-panel');

        let trellisPanelTitleElem = document.createElement('div');
        trellisPanelTitleElem.classList.add('title');
        trellisPanelElem.appendChild(trellisPanelTitleElem);

        let canvasElem = document.createElement('div');
        canvasElem.classList.add('canvas');
        trellisPanelElem.appendChild(canvasElem);

        this.trellisPanelElem = trellisPanelElem;
        this.trellisPanelTitleElem = trellisPanelTitleElem;
        this.canvasElem = canvasElem;
    }

    // Sets the title for the panel
    // For the case where it's a hidden trellis when non-trellised, this will
    // be set as a null and won't display the title
    setTitle(title) {
        this.trellisPanelTitleElem.innerHTML = title;
    }
}

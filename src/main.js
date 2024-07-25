/*
 * Copyright © 2024. Cloud Software Group, Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

Spotfire.initialize(async (mod) => {
    // Constants for mod properties
    const MOD_CONFIG_PROPERTY = 'mod-config';
    const ZOOM_PROPERTY = 'zoom';

    // Get the main element
    const mainElem = document.querySelector('.main'); // Main target

    // Create content element
    const contentElem = document.createElement('div');
    contentElem.classList.add('content');
    mainElem.appendChild(contentElem);

    // Create visualization target
    const vizElem = document.createElement('div');
    vizElem.classList.add('visualization');
    // contentElem.appendChild(vizElem); // will be added in zoom handler if commented out

    // Get the render context
    const context = mod.getRenderContext();

    // --------------------------------------------------------------------------------
    // SPOTFIRE DEFINITIONS

    // These are all let because they may be reassigned later
    let axes = {};
    let marking = null;
    let colorAxisType = null;
    let rows = null;
    let dark = false;

    // --------------------------------------------------------------------------------
    // DATA FUNCTIONS

    // Validate axes have required expressions
    const validateAxes = function() {
        let valid = true; // let because it will be modified
        valid = valid && DataUtility.validateAxisHasExpression(axes, "Layer Type", displayError);
        valid = valid && DataUtility.validateAxisHasExpression(axes, "X", displayError);
        valid = valid && DataUtility.validateAxisHasExpression(axes, "Y", displayError);
        
        return valid;
    };

    // Converts a row to an object
    const rowToObject = function(row) {
        const object = {};

        object.color = DataUtility.axisHasExpression(axes, "Color") ? row.color().hexCode : null;
        object.colorValue = DataUtility.axisHasExpression(axes, "Color") ? DataUtility.getColorValue(colorAxisType, row, "Color") : null;
        object.trellisBy = DataUtility.axisHasExpression(axes, "Trellis By") ? row.categorical("Trellis By").formattedValue() : null;
        object.groupBy = DataUtility.axisHasExpression(axes, "Group By") ? row.categorical("Group By").formattedValue() : null;
        object.layerType = row.categorical("Layer Type").formattedValue();
        object.name = DataUtility.axisHasExpression(axes, "Name") ? row.categorical("Name").formattedValue() : null;
        object.size = DataUtility.axisHasExpression(axes, "Size") ? row.continuous("Size").value() : null;
        object.x = row.continuous("X").value();
        object.y = row.continuous("Y").value();

        object.row = row;

        return object;
    }

    // --------------------------------------------------------------------------------
    // VIZ FUNCTIONS

    // Converts data rows into objects
    const processRows = async function() {
        if(rows == null) return false;

        // Get mod configuration
        const configuration = vizConfiguration.getConfiguration();
        if(configuration == null) return false;
        
        // Test for row count
        const rowLimit = configuration.rowLimit != null && configuration.rowLimit != null ? configuration.rowLimit : 500;
        const rowCount = rows.length;
        if(rowCount > rowLimit) {
            const message = `
                Cannot render - too many rows (rowCount: ${rowCount}, limit: ${rowLimit}). <br/><br/>
                Filter to a smaller subset of values. Or cautiously increase the Row Count in mod configuration, bearing in mind this may cause Spotfire to become unresponsive.
            `;
            displayError(message);
            return;
        }

        // Validate axes have required expressions
        const valid = validateAxes();
        if(valid == false) return;

        // Create new trellis items map
        const trellisItemMap = new TrellisItemMap();

        // Iterate over rows, convert to objects, then apply to group data
        rows.forEach(function(row) {
            // Convert the row to an object and add to the trellis map
            const object = rowToObject(row);
            trellisItemMap.addObjectToTrellisAndGroup(object.trellisBy, object.groupBy, object.layerType, object);
        });

        // Check trellis count doesn't exceed max
        const trellisLimit = configuration.maxTrellisCount != null ? configuration.maxTrellisCount : 5;
        const trellisCount = trellisItemMap.getCount();
        if(trellisCount > trellisLimit) {
            const message = `
                Cannot render - too many trellis panels (trellisCount: ${trellisCount}, limit: ${trellisLimit}). <br/><br/>
                Set Trellis By axis to a column with fewer values or filter to a smaller subset of values.
            `;
            displayError(message);
            return;
        }

        // Draw the viz with the specified trellis data
        drawViz(trellisItemMap);
    };

    // Draws the visualization
    const drawViz = async function(trellisItemMap) {  
        const configuration = vizConfiguration.getConfiguration();

        // Set trellis direction and trellised flag
        trellisCollection.setDirection(configuration.trellisDirection.toLowerCase());
        trellisCollection.setTrellised(DataUtility.axisHasExpression(axes, "Trellis By"));

        // Draw trellis panels (if required)
        trellisCollection.draw(trellisItemMap.getCount());

        // Create a configuration object to pass to the diagram
        const diagramConfig = {
            colorAxisType: colorAxisType,
            marking: marking,
            dark: dark,
            hasColorData: colorAxisType != null,
            showGridY: configuration.diagram.showGridY,
            showFormationLabels: configuration.diagram.showFormationLabels,
            strokeDashArray: configuration.diagram.strokeDashArray,
            strokeWidth: configuration.diagram.strokeWidth,
            wellSpacingPerpendicularNeighborLimit: configuration.diagram.wellSpacingPerpendicularNeighborLimit,
            wellSpacingHorizontalNeighborLimit: configuration.diagram.wellSpacingHorizontalNeighborLimit,
            wellSpacingVerticalNeighborLimit: configuration.diagram.wellSpacingVerticalNeighborLimit,
            allowWellMarking: configuration.diagram.allowWellMarking,
            allowFormationMarking: configuration.diagram.allowFormationMarking,
        };

        // Create an actions object for callback functions
        const actions = {
            showTooltip: showTooltip,
            hideTooltip: hideTooltip,
            clearAllMarking: clearAllMarking,
        };

        trellisItemMap.iterateTrellisItems(function(thisTrellisItem, thisTrellisItemIndex) {
            // Get panel and set the title
            const trellisPanel = trellisCollection.getPanel(thisTrellisItemIndex);
            trellisPanel.setTitle(thisTrellisItem.getName());

            // Get the canvas and group map
            const canvasElem = trellisPanel.getCanvasElem();
            const groupMap = thisTrellisItem.getGroupMap();

            // Get the diagram (let because it might change)
            let diagram = trellisPanel.getDiagram();
            
            // If there is no diagram, make one now
            if(diagram == null) {
                diagram = new WellSpacingDiagram(canvasElem, actions, zoomHandler, rectMarking);
                trellisPanel.setDiagram(diagram);
            }

            // Draw the diagram (this will draw or update depending on whether it exists)
            diagram.draw(groupMap, diagramConfig);

        });
    };

    // --------------------------------------------------------------------------------
    // ERRORS

    // Displays an error overlay
    const displayError = function(message) {
        // Get the inner content element and hide
        let contentInnerElem = contentElem.querySelector('.content-inner');
        contentInnerElem.style.display = 'none';

        // Get the error element (let because it might be changed)
        let errorElem = contentElem.querySelector('.error-detail');

        // If not found, create one and append
        if(errorElem == null) {
            errorElem = document.createElement('div');
            errorElem.classList.add('error-detail');
            contentElem.appendChild(errorElem);
        }

        // Set error element text
        errorElem.innerHTML = message;
    };

    // Clears the error overlay
    const clearError = function() {
        // Get the error element
        const errorElem = contentElem.querySelector('.error-detail');

        // If found, remove it
        if(errorElem != null) {
            contentElem.removeChild(errorElem);
        }

        // Get the inner content element and show
        let contentInnerElem = contentElem.querySelector('.content-inner');
        contentInnerElem.style.display = 'flex';
    };

    // --------------------------------------------------------------------------------
    // ACTIONS

    // Display a new tooltip
    const showTooltip = function(object) {
        const configuration = vizConfiguration.getConfiguration();
        if(configuration.showTooltips == true)
            mod.controls.tooltip.show(object);
    }

    // Hide any visible tooltip
    const hideTooltip = function() {
        mod.controls.tooltip.hide();
    }

    // Clears marking in all trellis panels
    const clearAllMarking = function() {
        for(let thisRow of rows) {
            if(thisRow.isMarked() == true) {
                thisRow.mark('Subtract'); 
            }
        }   
    }

    // --------------------------------------------------------------------------------
    // CONFIGURATION

    // Read and set initial configuration
    const readInitialConfig = async function() {
        // Read initial configuration and set to configuration object
        // Create event listener to detect configuration changes and redraw
        const modConfigStr = (await mod.property(MOD_CONFIG_PROPERTY)).value();
        vizConfiguration.setConfigurationStr(modConfigStr);
        vizConfiguration.addEventListener(VizConfiguration.CONFIG_CHANGE_EVENT, async function(e) {
            const configuration = e.configuration;

            // Save the configuration to the mod configuration
            mod.property(MOD_CONFIG_PROPERTY).set(JSON.stringify(configuration));

            // Apply to zoom handler
            zoomHandler.showZoom(configuration.showZoomX, configuration.showZoomY);

            // Reprocess rows to objects and draw viz
            clearError();
            await processRows();

            // Signal render complete
            context.signalRenderComplete();
        });

        // Extract configuration object
        const configuration = vizConfiguration.getConfiguration();

        // Read initial zoom configuration and set ranges, then display if enabled
        // Create event listener to detect zoom changes and set to mod config
        const zoomConfigStr = (await mod.property(ZOOM_PROPERTY)).value();
        zoomHandler.setZoomRangeStr(zoomConfigStr);
        zoomHandler.showZoom(configuration.showZoomX, configuration.showZoomY);
        zoomHandler.addEventListener(ZoomHandler.ZOOM_CHANGE_EVENT, function(e) {
            const range = zoomHandler.getZoomRange();
            const rangeStr = JSON.stringify(range);
            mod.property(ZOOM_PROPERTY).set(rangeStr);
        });
    };

    // --------------------------------------------------------------------------------
    // RECT MARKING

    // Selection handler for rectangular marking
    const rectangularMarking = function(selection) {
        // If configuration is visible, then do nothing
        if(vizConfiguration.isActive() == true) return;
        
        // Its a selection
        if(selection.dragSelectComplete == true) {
            // Initialize selected rows array
            let selectedRows = [];

            // Get selected rows from each trellis panel
            for(let thisTrellisPanel of trellisCollection.getPanels()) {
                if(thisTrellisPanel.getDiagram() != null) {
                    let thisSelectedRows = thisTrellisPanel.getDiagram().rectangleSelection(selection);
                    selectedRows.push(thisSelectedRows);
                }
            }

            // Flatten the array of arrays
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

    // --------------------------------------------------------------------------------
    // SETUP UTILITY OBJECTS

    // Rectangular marking, disabled by default
    const rectMarking = new RectMarking(vizElem);
    rectMarking.addHandlersSelection(rectangularMarking);

    // Trellis collection to hold trellis panels
    const trellisCollection = new TrellisCollection(vizElem);

    // Zoom handler
    const zoomHandler = new ZoomHandler(contentElem, vizElem);

    // Viz configuration object
    const vizConfiguration = new VizConfiguration(mainElem, contentElem, context.isEditing, axes);

    // Read initial configuration from mod config
    await readInitialConfig();

    // --------------------------------------------------------------------------------
    // MAIN DATA EVENT HANDLER

    // Create a read function for axis, data, and windowSize changes
    // Subscribe to the reader function
    const reader = mod.createReader(
        mod.visualization.axis("Color"),
        mod.visualization.axis("Trellis By"),
        mod.visualization.axis("Group By"),
        mod.visualization.axis("Layer Type"),
        mod.visualization.axis("Name"),
        mod.visualization.axis("Size"),
        mod.visualization.axis("X"),
        mod.visualization.axis("Y"),
        mod.visualization.data(), 
        mod.windowSize()
    );
    reader.subscribe(render);

    // Render function for axis, data, and windowSize changes
    async function render(colorView, trellisByView, groupByView, layerTypeView, nameView, sizeView, xView, yView,
            dataView, windowSize) {

        // Check for errors, display and return if present
        const errors = await dataView.getErrors();
        if(errors.length > 0) {
            displayError(errors);
            return;
        }

        // Otherwise clear the error
        clearError();

        // Copy the axes over
        axes = {};
        const axesArr = [colorView, trellisByView, groupByView, layerTypeView, nameView, sizeView, xView, yView];
        for(let thisAxis of axesArr) {
            axes[thisAxis.name] = thisAxis;
        }

        // Set marking flag based on the marking configuration, and enabled or disable rectMarking
        marking = await dataView.marking();
        if(rectMarking != null) {
            rectMarking.setEnabled(marking != null);
        }

        // Determine color axis type based on axis configuration in the dataView
        //   There seems to be a race condition with axis view, this is more accurate
        colorAxisType = await DataUtility.getColorAxisType(dataView, "Color");

        // Determine if it's a dark canvas
        dark = DataUtility.isDarkCanvas(context.styling.general.backgroundColor);
        if(dark == true)
            contentElem.classList.add('dark');
        else
            contentElem.classList.remove('dark');

        // Get all rows and process
        rows = await dataView.allRows();

        // Process rows to objects and draw viz
        await processRows();

        // Signal render complete
        context.signalRenderComplete();
    }

});

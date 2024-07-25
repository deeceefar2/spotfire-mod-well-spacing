/*
 * Copyright © 2024. Cloud Software Group, Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

class WellSpacingDiagram {
    // Default colors and sizes
    static DEFAULT_COLOR = '#FAA264';
    static FORMATION_POINT_DEFAULT_SIZE = 3;
    static WELL_POINT_DEFAULT_SIZE = 7;

    // Settings for distance measurements
    static DISTANCE_RENDER_METHOD = "alternating"; //"center" | "alternating"
    static NEIGHBOR_LIMIT_PERPENDICULAR = 2;
    static NEIGHBOR_LIMIT_HORIZONTAL = 1;
    static NEIGHBOR_LIMIT_VERTICAL = 1;

    // Margin settings
    static TOP_MARGIN = 10;
    static RIGHT_MARGIN = 30;
    static BOTTOM_MARGIN = 30;
    static LEFT_MARGIN = 60;

    // Distance modes
    static DISTANCE_MODE_NONE = 'none'; // Lower case version of the ones in the select
    static DISTANCE_MODES = ['None', 'Horizontal', 'Perpendicular', 'Vertical', 'Vertical + Horizontal'];

    // Layer types
    static LAYER_TYPE_FORMATION = 'formation';
    static LAYER_TYPE_WELLS = 'wells';

    // Declare properties set in constructor
    #canvasElem;
    #actions;
    #zoomRange;
    #rectMarking;

    // Declare properties set during draw phase
    #groupMap;              // Group map with data
    #configuration;         // Configuration object
    #diagramElem;           // Diagram element
    #plotAreaElem;          // Plot area element

    #initialized = false;   // Initialization flag for draw once
    #distanceMode = WellSpacingDiagram.DISTANCE_MODE_NONE;
    #distancesLimitToMarked = false;
    #scales;
    #wells;
    #svgMaskedG;
    #measuringStickHandler = new MeasuringStickHandler();

    constructor(canvasElem, actions, zoomHandler, rectMarking) {
        // Declare properties and set parameters
        this.#canvasElem = canvasElem;
        this.#actions = actions;
        this.#rectMarking = rectMarking;

        // Set the zoom range
        this.#zoomRange = zoomHandler.getZoomRange();

        // EVENT HANDLERS
        // Append zoom handlers
        const self = this;
        zoomHandler.addEventListener(ZoomHandler.ZOOM_CHANGE_EVENT, function(e) {
            let changed = false;
            if(e.x != null) {
                self.#zoomRange.x = e.x;
                changed = true;
            }
            if(e.y != null) {
                self.#zoomRange.y = e.y; 
                changed = true;
            }
            
            if(changed == true) {
                self.drawData();
            }
        });
    }

    /* ---------------------------------------------------------------------------------------------------- */
    /* DRAW COMPONENTS */
    // Draw main
    draw(groupMap, configuration) {
        // Set properties
        this.#groupMap = groupMap;
        this.#configuration = configuration;
        

        // Check initialization flag, if not yet initialized then call drawOnce to update
        //   one time UI components
        if(this.#initialized == false) {
            this.drawOnce();
        }

        // Always call draw data
        this.drawData();

        // Set markable class if marking enabled
        const diagramElem = this.#diagramElem;
        if(configuration.marking != null) {
            diagramElem.classList.add('markable');
        }
        else {
            diagramElem.classList.remove('markable');
        }
    }

    // Draws one-time components 
    drawOnce() {
        const canvasElem = this.#canvasElem;

        // Create diagram element and append
        const diagramElem = document.createElement('div');
        diagramElem.classList.add('well-spacing-diagram');
        canvasElem.appendChild(diagramElem);
        this.#diagramElem = diagramElem;

        // Draw the toolbar and plot area elements
        const toolbarElem = this.drawToolbar();
        const plotAreaElem = this.drawPlotArea();

        // Set property for plot area element
        this.#plotAreaElem = plotAreaElem;

        if(this.#measuringStickHandler != null) {
            this.#measuringStickHandler.setPlotArea(plotAreaElem, this.getMargin());
        }

        // Set initialized flag to true
        this.#initialized = true;
    }

    // Draw toolbar
    drawToolbar() {
        const self = this;
        
        const diagramElem = this.#diagramElem;

        // Create toolbar element
        const toolbarElem = document.createElement('div');
        toolbarElem.classList.add('toolbar');
        diagramElem.appendChild(toolbarElem);

        // DISTANCE DISPLAY SELECT
        // Append select for displaying distances
        const selectLabelElem = document.createElement('div');
        selectLabelElem.classList.add('distance-select-label');
        selectLabelElem.innerHTML = 'Show Distances';
        toolbarElem.appendChild(selectLabelElem);

        const selectElem = document.createElement('select');
        toolbarElem.appendChild(selectElem);

        const opts = WellSpacingDiagram.DISTANCE_MODES;
        for(const thisEnumItem of opts) {
            const optionElem = document.createElement('option');
            optionElem.innerHTML = thisEnumItem;
            if(thisEnumItem.toLocaleLowerCase() == this.#distanceMode) {
                optionElem.setAttribute('selected', true);
            }
            selectElem.appendChild(optionElem);
        }

        // On change of select element, show/hide appropriate distances
        selectElem.addEventListener('change', function(event) {
            event.stopPropagation();

            // Set the distance mode and display
            self.#distanceMode = selectElem.value.toLowerCase();
            self.showDistances();
        });


        // LIMIT TO MARKING
        const limitToMarkingElem = document.createElement('div');
        limitToMarkingElem.classList.add('limit-to-marking');
        toolbarElem.appendChild(limitToMarkingElem);
        
        // Append checkbox for limit to marking
        const checkboxElem = document.createElement('input');
        checkboxElem.setAttribute('type', 'checkbox');
        checkboxElem.checked = this.#distancesLimitToMarked;
        limitToMarkingElem.appendChild(checkboxElem);

        const limitMarkingLabelElem = document.createElement('div');
        limitMarkingLabelElem.classList.add('distance-select-label');
        limitMarkingLabelElem.innerHTML = 'Limit to Marked Rows';
        limitToMarkingElem.appendChild(limitMarkingLabelElem);

        // On change of select element, show/hide appropriate distances
        checkboxElem.addEventListener('mousedown', (e) => e.stopPropagation());
        checkboxElem.addEventListener('change', (event) => {
            event.stopPropagation();
            self.#distancesLimitToMarked = event.target.checked;
            self.toggleLimitToDistances();
        });


        // Check for measuring stick handler
        if(this.#measuringStickHandler != null) {
            this.#measuringStickHandler.drawToggleButtons(toolbarElem);
        }
        
        return toolbarElem;
    }

    // Draw plot area
    drawPlotArea() {
        const self = this;

        const diagramElem = this.#diagramElem;

        const plotAreaElem = document.createElement('div');
        plotAreaElem.classList.add('plot-area');
        diagramElem.appendChild(plotAreaElem);

        // Append click handler for plot area clicks
        plotAreaElem.addEventListener('click', function(event) {
            // If there is an active measuring stick, remove it now
            if(self.#measuringStickHandler != null && self.#measuringStickHandler.isActive() == true) {
                self.removeMeasuringStick();
            }
            // Otherwise clear marking
            else {
                self.#actions.clearAllMarking();
            }
        });

        return plotAreaElem;
    }

    // Draw data components
    drawData() {
        const groupMap = this.#groupMap;
        const plotAreaElem = this.#plotAreaElem;

        // Clear contents
        plotAreaElem.innerHTML = '';

        // Get margins and dimensions
        const margin = this.getMargin();
        const width = plotAreaElem.clientWidth - margin.left - margin.right;
        const height = plotAreaElem.clientHeight - margin.top - margin.bottom;

        // Build data
        const calcDomainsResult = this.calculateDomains(groupMap, width, height);
        this.calculateWellDeltas(calcDomainsResult.wells);
        
        // Set wells property
        this.#wells = calcDomainsResult.wells;

        // Draw components
        // Draw base SVG
        const svg = d3.select(plotAreaElem)
            .append('svg')
                .attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom);

        // Draw SVG group for offset, this will contain all further components
        const svgTransformG = svg.append('g')
                .attr('transform',
                    'translate(' + margin.left + ',' + margin.top + ')');
        
        // Create a Mask defs for clip path. This is used with zoom sliders to prevent
        //   components displaying outside the axes
        const mask = svg.append("defs")
            .append("clipPath")
                .attr("id", "mask")
                .style("pointer-events", "none")
            .append("rect")
                .attr('x', 0)
                .attr('y', 0)
                .attr('width', width)
                .attr('height', height);
                   
        // Draw axis scales
        const scales = this.drawScales(svgTransformG, calcDomainsResult.x_domain, calcDomainsResult.y_domain, width, height);
        
        // Set scales property
        this.#scales = scales;

        // Create group for to hold plot elements that will be clipped with mask
        const svgMaskedG = svgTransformG.append('g')
            .attr("clip-path", "url(#mask)");
        this.#svgMaskedG = svgMaskedG;

        if(this.#measuringStickHandler != null) {
            this.#measuringStickHandler.setSVG(svg, svgMaskedG, scales);
        }

        // Draw formations
        this.drawFormations(svgMaskedG, calcDomainsResult.x_domain, calcDomainsResult.y_domain, calcDomainsResult.formations);

        // Draw distance deltas
        this.drawWellDistances(svgMaskedG, calcDomainsResult.wells);

        // Draw wells
        this.drawWells(svgMaskedG, calcDomainsResult.wells);

        // Draw well distance labels
        this.drawWellDistanceLabels(svgMaskedG, calcDomainsResult.wells);

        // Show selected distances
        this.showDistances();
    }

    // Compute scales and draw x and y axis
    drawScales(svg, x_domain, y_domain, width, height) {
        const configuration = this.#configuration;

        // Define and append x-axis
        const xScale = d3.scaleLinear()
            .domain(x_domain)
            .range([0, width]);
       
        svg.append('g')
            .attr('class', 'scale scale-x')
            .attr('transform', 'translate(0,' + height + ')')
            .call(d3.axisBottom(xScale));                    
        
        
        // Define and append y-axis
        const yScale = d3.scaleLinear()
            .domain(y_domain)
            .range([height, 0]);

        // Append y-axis
        svg.append('g')
            .attr('class', 'scale scale-y')
            .call(d3.axisLeft(yScale));

        // Append grid Y if enabled
        if(configuration.showGridY == true) {
            svg.append('g')
                .attr('class', 'grid grid-y')
                .selectAll('grid-y')      
                .data(yScale.ticks())
                .enter()
                    .append('line')
                        .attr('class', 'grid grid-y')
                        .attr('x1', xScale(x_domain[0]))
                        .attr('x2', xScale(x_domain[1]))
                        .attr('y1', (d) => yScale(d))
                        .attr('y2', (d) => yScale(d));
        }

        return {
            xScale: xScale,
            yScale: yScale
        }
    }

    // Draw formation lines
    drawFormations(svg, x_domain, y_domain, formations) {
        if(formations.length == 0) return;
        
        const self = this;

        const scales = this.#scales;
        const xScale = scales.xScale;
        const yScale = scales.yScale;
        const configuration = this.#configuration;

        const groupElem = svg.append('g');
        groupElem.attr('class', 'formations');

        // Define functions for mouseover and mouseout
        // Create function to mouse over formation
        const mouseOverFormation = function(event, obj) {
            event.stopPropagation(); 
            self.#actions.showTooltip(obj.row);
        }
    
        // Create function for mouse out of formation
        const mouseOutFormation = function(event) {
            event.stopPropagation();
            self.#actions.hideTooltip();
        }

        // Iterate over each formation group and draw
        for(const thisFormationGroup of formations) {
            // Draw formation as line and circles for marking
            // Sort the lines into start and end
            const lines = [];
            for(let idx = 0; idx < thisFormationGroup.getData().length - 1; idx++) {
                const thisLine = {
                    start: thisFormationGroup.getData()[idx],
                    end: thisFormationGroup.getData()[idx + 1]
                }
                lines.push(thisLine);
            }

            // Append formation lines
            groupElem
                .selectAll('formation')
                .data(lines)
                .enter()
                    .append('line')
                        .attr('class', 'formation selectable')
                        .attr('stroke', (d) => {
                            let color = d.start.color;
                            if(d.start.row.isMarked() != d.end.row.isMarked() && d.end.row.isMarked() == false)
                                color = d.end.color;
                            if(color == null) 
                                color = WellSpacingDiagram.DEFAULT_COLOR;
                            return color;
                        })
                        .attr('stroke-width', configuration.strokeWidth)
                        .attr('stroke-dasharray', configuration.strokeDashArray)
                        .attr("x1", (d) => xScale(d.start.x))
                        .attr("y1", (d) => yScale(d.start.y))
                        .attr("x2", (d) => xScale(d.end.x))
                        .attr("y2", (d) => yScale(d.end.y))
                        .on('mouseover', (event, d) => mouseOverFormation(event, d))
                        .on('mouseout', (event, d) => mouseOutFormation(event));


            // Append formation circles
            groupElem
                .selectAll('formation')
                .data(thisFormationGroup.getData())
                .enter()
                    .append('circle')
                        .attr('class', 'formation-circle selectable')
                        .attr('cx', (d) => xScale(d.x))
                        .attr('cy', (d) => yScale(d.y))
                        .attr('r', (d) => d.size == null ? WellSpacingDiagram.FORMATION_POINT_DEFAULT_SIZE : d.size)
                        .on('mouseover', (event, d) => mouseOverFormation(event, d))
                        .on('mouseout', (event, d) => mouseOutFormation(event))
                        .attr('stroke', 'lightgrey')
                        .attr('stroke-width', (d) => d.row.isMarked() == true ? 1 : 0)
                        .style('fill', (d) => d.row.isMarked() == true ? d.color : 'transparent')

            // Append formation labels
            if(configuration.showFormationLabels == true) {
                // Need to get label line point furthest to the right to determine the y position
                let labelLine = null;
                let y_visibleCount = 0;
                for(const thisFormationData of thisFormationGroup.getData()) {
                    const thisVisible = thisFormationData.y > y_domain[0] && thisFormationData.y < y_domain[1];
                    if(thisVisible == true)
                        y_visibleCount++;

                    if(thisFormationData.x < x_domain[0])
                        continue;
                    else if(thisFormationData.x < x_domain[1]) {
                        labelLine = thisFormationData;
                    }
                    else
                        break;
                }

                // If there are no visible label line points, then do not display the label because it means
                //   it has been zoomed out of view
                if(y_visibleCount > 0) {
                    groupElem
                        .selectAll('formation')
                        .data([labelLine])
                        .enter()
                            .append('text')
                                .attr('class', 'formation-label')
                                .attr('x', xScale(x_domain[1]))
                                .attr('y', (d) => d.y - 15 < y_domain[0] ? yScale(y_domain[0]) - 15 : d.y + 15 > y_domain[1] ? yScale(y_domain[1]) + 15 : yScale(d.y) + 15)
                                .text((d) => d.name);
                }
            }            
        }
    }

    // Draw all distance types
    drawWellDistances(svg, wells) {
        // If no wells, just return
        if(wells.length == 0) return;

        // Create new group
        const groupElem = svg.append('g');
        groupElem.attr('class', 'distances');

        // Draw perpendicular distances
        this.drawWellPerpendicularDistances(groupElem, wells);

        // Draw vertical distances
        this.drawWellVerticalDistances(groupElem, wells);

        // Draw horizontal distances
        this.drawWellHorizontalDistances(groupElem, wells);
    }

    // Draw perpendicular distances
    drawWellPerpendicularDistances(parentGroupElem, wells) {
        const scales = this.#scales;
        const xScale = scales.xScale;
        const yScale = scales.yScale;

        const groupElem = parentGroupElem.append('g');
        groupElem.attr('class', 'distance perpendicular');

        // Add well deltas
        for(const thisWellGroup of wells) {
            if(thisWellGroup.computed == null) continue;
            const enterSelection = groupElem.append('g')
                .attr('class', 'delta-distance perpendicular')
                .selectAll('well-perpendicular')      
                .data(thisWellGroup.computed.dh)
                .enter();

            // Append line
            enterSelection.append('line')
                .attr('class', 'delta-distance perpendicular')
                .attr('x1', (d) => xScale(d.x1))
                .attr('x2', (d) => xScale(d.x2))
                .attr('y1', (d) => yScale(d.y1))
                .attr('y2', (d) => yScale(d.y2));

            // Insert text
            // This will be done later to prevent label from being obscured
            /*enterSelection.insert('text')
                .attr('class', 'delta-distance perpendicular')
                .attr('x', (d) => PerpendicularDistance.getLabelPositionX(xScale, d.x1, d.x2))
                .attr('y', (d) => PerpendicularDistance.getLabelPositionY(yScale, d.y1, d.y2))
                .attr('transform', (d) => PerpendicularDistance.getLabelTransform(xScale, yScale, d.x1, d.x2, d.y1, d.y2))
                .text((d) => Math.round(d.dh));*/
        }

        return groupElem;
    }

    // Draw vertical distances
    drawWellVerticalDistances(parentGroupElem, wells) {
        const scales = this.#scales;
        const xScale = scales.xScale;
        const yScale = scales.yScale;

        const groupElem = parentGroupElem.append('g');
        groupElem.attr('class', 'distance vertical');

        for(const thisWellGroup of wells) {
            if(thisWellGroup.computed == null) continue;
            const enterSelection = groupElem.append('g')
                .attr('class', 'delta-distance vertical')
                .selectAll('well-vertical')      
                .data(thisWellGroup.computed.dy)
                .enter();

            if(WellSpacingDiagram.DISTANCE_RENDER_METHOD == "center") {
                // Append vertical line at mid point betweek points
                enterSelection.append('line')
                    .attr('class', 'delta-distance vertical')
                    .attr('x1', (d) => (xScale(d.x1) + xScale(d.x2)) / 2)
                    .attr('x2', (d) => (xScale(d.x1) + xScale(d.x2)) / 2)
                    .attr('y1', (d) => yScale(d.y1))
                    .attr('y2', (d) => yScale(d.y2));

                // Insert horizontal lines from start
                enterSelection.insert('line')
                    .attr('class', 'delta-distance vertical boundary')
                    .attr('x1', (d) => xScale(d.x1) + d.r1 + 3)
                    .attr('x2', (d) => (xScale(d.x1) + xScale(d.x2)) / 2 + 3)
                    .attr('y1', (d) => yScale(d.y1))
                    .attr('y2', (d) => yScale(d.y1));

                // Insert horizontal lines from end
                enterSelection.insert('line')
                    .attr('class', 'delta-distance vertical boundary')
                    .attr('x1', (d) => (xScale(d.x1) + xScale(d.x2)) / 2 - 3)
                    .attr('x2', (d) => xScale(d.x2) + d.r2 - 3)
                    .attr('y1', (d) => yScale(d.y2))
                    .attr('y2', (d) => yScale(d.y2));

                // Insert text
                // This will be done later to prevent label from being obscured
                /*enterSelection.insert('text')
                    .attr('class', 'delta-distance vertical')
                    .attr('x', (d) => (xScale(d.x1) + xScale(d.x2)) / 2)
                    .attr('y', (d) => (yScale(d.y1) + yScale(d.y2)) / 2)
                    .attr('transform', (d) => 'rotate(' + 270 + ',' + (xScale(d.x1) + xScale(d.x2)) / 2 + ',' + (yScale(d.y1) + yScale(d.y2)) / 2 + ') translate(' + 0 + ',' + 3 + ')')
                    .text((d) => Math.abs(Math.round(d.dy)));*/
            }
            else if(WellSpacingDiagram.DISTANCE_RENDER_METHOD == "alternating") {                
                const getX = (d) => d.location == 0 ? xScale(d.x1) : xScale(d.x2);
                const getY = (d) => d.location == 0 ? yScale(d.y2) : yScale(d.y1);

                // Append vertical line
                enterSelection.append('line')
                    .attr('class', 'delta-distance vertical')
                    .attr('x1', (d) => getX(d))
                    .attr('x2', (d) => getX(d))
                    .attr('y1', (d) => yScale(d.y1))
                    .attr('y2', (d) => yScale(d.y2));                

                // Insert horizontal line from end
                enterSelection.insert('line')
                    .attr('class', 'delta-distance vertical boundary')
                    .attr('x1', (d) => xScale(d.x1))
                    .attr('x2', (d) => xScale(d.x2))
                    .attr('y1', (d) => getY(d))
                    .attr('y2', (d) => getY(d));

                // Insert text
                // This will be done later to prevent label from being obscured
                /*enterSelection.insert('text')
                    .attr('class', 'delta-distance vertical')
                    .attr('x', (d) => getX(d))
                    .attr('y', (d) => (yScale(d.y1) + yScale(d.y2)) / 2)
                    .attr('transform', (d) => 'rotate(' + 270 + ',' + getX(d) + ',' + (yScale(d.y1) + yScale(d.y2)) / 2 + ') translate(' + 0 + ',' + 3 + ')')
                    .text((d) => Math.abs(Math.round(d.dy)));*/
            }
        }
    }

    // Draw horizontal distances
    drawWellHorizontalDistances(parentGroupElem, wells) {
        const scales = this.#scales;
        const xScale = scales.xScale;
        const yScale = scales.yScale;

        const groupElem = parentGroupElem.append('g');
        groupElem.attr('class', 'distance horizontal');

        for(const thisWellGroup of wells) {
            if(thisWellGroup.computed == null) continue;
            const enterSelection = groupElem.append('g')
                .attr('class', 'delta-distance horizontal')
                .selectAll('well-horizontal')      
                .data(thisWellGroup.computed.dx)
                .enter();

            if(WellSpacingDiagram.DISTANCE_RENDER_METHOD == "center") {
                // Append horitonzal line at mid point betweek points
                enterSelection.append('line')
                    .attr('class', 'delta-distance horizontal')
                    .attr('x1', (d) => xScale(d.x1))
                    .attr('x2', (d) => xScale(d.x2))
                    .attr('y1', (d) => (yScale(d.y1) + yScale(d.y2)) / 2)
                    .attr('y2', (d) => (yScale(d.y1) + yScale(d.y2)) / 2);

                // Insert vertical line from start
                enterSelection.insert('line')
                    .attr('class', 'delta-distance horizontal boundary')
                    .attr('x1', (d) => xScale(d.x1))
                    .attr('x2', (d) => xScale(d.x1))
                    .attr('y1', (d) => yScale(d.y1) + (d.y1 > d.y2 ? 1 : -1) * (d.r1 + 2))
                    .attr('y2', (d) => (yScale(d.y1) + yScale(d.y2)) / 2 + (d.y1 > d.y2 ? 1 : -1) * 2);

                // Insert vertical line from end
                enterSelection.insert('line')
                    .attr('class', 'delta-distance horizontal boundary')
                    .attr('x1', (d) => xScale(d.x2))
                    .attr('x2', (d) => xScale(d.x2))
                    .attr('y1', (d) => yScale(d.y2) + + (d.y1 < d.y2 ? 1 : -1) * (d.r2 + 2))
                    .attr('y2', (d) => (yScale(d.y1) + yScale(d.y2)) / 2 + (d.y1 < d.y2 ? 1 : -1) * 2);

                    
                // Insert text
                // This will be done later to prevent label from being obscured
                /*enterSelection.insert('text')
                    .attr('class', 'delta-distance horizontal')
                    .attr('x', (d) => (xScale(d.x1) + xScale(d.x2)) / 2)
                    .attr('y', (d) => (yScale(d.y1) + yScale(d.y2)) / 2 + 3)
                    .text((d) => Math.abs(Math.round(d.dx))); */
            }
            else if(WellSpacingDiagram.DISTANCE_RENDER_METHOD == "alternating") {
                const getX = (d) => d.location == 0 ? xScale(d.x1) : xScale(d.x2);
                const getY =(d) => d.location == 0 ? yScale(d.y2) : yScale(d.y1);

                // Append horitonzal line 
                enterSelection.append('line')
                    .attr('class', 'delta-distance horizontal')
                    .attr('x1', (d) => xScale(d.x1))
                    .attr('x2', (d) => xScale(d.x2))
                    .attr('y1', (d) => getY(d))
                    .attr('y2', (d) => getY(d)); 
                    
                // Insert vertical line from end
                enterSelection.insert('line')
                    .attr('class', 'delta-distance horizontal boundary')
                    .attr('x1', (d) => getX(d))
                    .attr('x2', (d) => getX(d))
                    .attr('y1', (d) => yScale(d.y2))
                    .attr('y2', (d) => yScale(d.y1));

                // Insert text
                // This will be done later to prevent label from being obscured
                /*enterSelection.insert('text')
                    .attr('class', 'delta-distance horizontal')
                    .attr('x', (d) => (xScale(d.x1) + xScale(d.x2)) / 2)
                    .attr('y', (d) => getY(d) + 3)
                    .text((d) => Math.abs(Math.round(d.dx)));*/
            }
        }
    }

    // Draw well points
    drawWells(svg, wells) {
        const self = this;

        const scales = this.#scales;
        const xScale = scales.xScale;
        const yScale = scales.yScale;

        if(wells.length == 0) return;

        const groupElem = svg.append('g');
        groupElem.attr('class', 'wells');

        // Create function to mouse over well
        const mouseOverWell = function(event, obj) {
            event.stopPropagation(); 
            
            // If measuring stick is active, append this as an end for snap
            // No tooltip is shown because it interferes with the measuring stick
            if(self.#measuringStickHandler != null && self.#measuringStickHandler.isActive() == true) {
                self.#measuringStickHandler.setEnd(obj);
            }
            // Otherwise show the tooltip
            else {
                self.#actions.showTooltip(obj.row);
            }
        }
    
        // Create function for mouse out of well
        const mouseOutWell = function(event) {
            event.stopPropagation();
    
            // Unsnap end of measuring stick
            if(self.#measuringStickHandler != null && self.#measuringStickHandler.isActive() == true) {
                self.#measuringStickHandler.setEnd(null);
            }
            self.#actions.hideTooltip();
        }
    
        // Iterate over the well groups
        for(const thisWellGroup of wells) {
            groupElem
                .selectAll('well')
                .data(thisWellGroup.getData())
                .enter()
                    .append('circle')
                        .attr('class', 'well selectable')
                        .attr('cx', (d) => xScale(d.x))
                        .attr('cy', (d) => yScale(d.y))
                        .attr('r', (d) => d.size == null ? WellSpacingDiagram.WELL_POINT_DEFAULT_SIZE : d.size)
                        .style('fill', (d) => d.color == null ? WellSpacingDiagram.DEFAULT_COLOR : d.color)
                        .on('mouseover', (event, d) => mouseOverWell(event, d))
                        .on('mouseout', (event, d) => mouseOutWell(event))
                        .on('mousedown', (event, d) => event.stopPropagation())
                        .on('click', (event, d) => {event.stopPropagation(); self.pointClick(event, d);});
                        //.append("svg:title")
                        //    .text((d) => `x:${d.x} y:${d.y}`; });
        }
    }

    // Draw well distance labels
    drawWellDistanceLabels(svg, wells) {
        // If no wells, just return
        if(wells.length == 0) return;

        // Create new group
        const groupElem = svg.append('g');
        groupElem.attr('class', 'distances labels');

        // Draw perpendicular distances
        this.drawWellPerpendicularDistanceLabels(groupElem, wells);

        // Draw vertical distances
        this.drawWellVerticalDistanceLabels(groupElem, wells);

        // Draw horizontal distances
        this.drawWellHorizontalDistanceLabels(groupElem, wells);
    }

    // Draw perpendicular distance labels
    drawWellPerpendicularDistanceLabels(parentGroupElem, wells) {
        const scales = this.#scales;
        const xScale = scales.xScale;
        const yScale = scales.yScale;

        const groupElem = parentGroupElem.append('g');
        groupElem.attr('class', 'distance perpendicular');

        // Add well deltas
        for(const thisWellGroup of wells) {
            if(thisWellGroup.computed == null) continue;
            const enterSelection = groupElem.append('g')
                .attr('class', 'delta-distance perpendicular')
                .selectAll('well-perpendicular')      
                .data(thisWellGroup.computed.dh)
                .enter();

            // Insert text
            enterSelection.insert('text')
                .attr('class', 'delta-distance perpendicular')
                .attr('x', (d) => PerpendicularDistance.getLabelPositionX(xScale, d.x1, d.x2))
                .attr('y', (d) => PerpendicularDistance.getLabelPositionY(yScale, d.y1, d.y2))
                .attr('transform', (d) => PerpendicularDistance.getLabelTransform(xScale, yScale, d.x1, d.x2, d.y1, d.y2))
                .text((d) => Math.round(d.dh));
        }
    }

    // Draw vertical distance labels
    drawWellVerticalDistanceLabels(parentGroupElem, wells) {
        const scales = this.#scales;
        const xScale = scales.xScale;
        const yScale = scales.yScale;

        const groupElem = parentGroupElem.append('g');
        groupElem.attr('class', 'distance vertical');

        for(const thisWellGroup of wells) {
            if(thisWellGroup.computed == null) continue;
            const enterSelection = groupElem.append('g')
                .attr('class', 'delta-distance vertical')
                .selectAll('well-vertical')      
                .data(thisWellGroup.computed.dy)
                .enter();

            if(WellSpacingDiagram.DISTANCE_RENDER_METHOD == "center") {
                // Insert text
                enterSelection.insert('text')
                    .attr('class', 'delta-distance vertical')
                    .attr('x', (d) => (xScale(d.x1) + xScale(d.x2)) / 2)
                    .attr('y', (d) => (yScale(d.y1) + yScale(d.y2)) / 2)
                    .attr('transform', (d) => 'rotate(' + 270 + ',' + (xScale(d.x1) + xScale(d.x2)) / 2 + ',' + (yScale(d.y1) + yScale(d.y2)) / 2 + ') translate(' + 0 + ',' + 3 + ')')
                    .text((d) => Math.abs(Math.round(d.dy)));
            }
            else if(WellSpacingDiagram.DISTANCE_RENDER_METHOD == "alternating") {                
                const getX = (d) => d.location == 0 ? xScale(d.x1) : xScale(d.x2);

                // Insert text
                enterSelection.insert('text')
                    .attr('class', 'delta-distance vertical')
                    .attr('x', (d) => getX(d))
                    .attr('y', (d) => (yScale(d.y1) + yScale(d.y2)) / 2)
                    .attr('transform', (d) => 'rotate(' + 270 + ',' + getX(d) + ',' + (yScale(d.y1) + yScale(d.y2)) / 2 + ') translate(' + 0 + ',' + 3 + ')')
                    .text((d) => Math.abs(Math.round(d.dy)));
            }
        }
    }

    // Draw horizontal distance labels
    drawWellHorizontalDistanceLabels(parentGroupElem, wells) {
        const scales = this.#scales;
        const xScale = scales.xScale;
        const yScale = scales.yScale;

        const groupElem = parentGroupElem.append('g');
        groupElem.attr('class', 'distance horizontal');

        for(const thisWellGroup of wells) {
            if(thisWellGroup.computed == null) continue;
            const enterSelection = groupElem.append('g')
                .attr('class', 'delta-distance horizontal')
                .selectAll('well-horizontal')      
                .data(thisWellGroup.computed.dx)
                .enter();

            if(WellSpacingDiagram.DISTANCE_RENDER_METHOD == "center") {
                // Insert text
                enterSelection.insert('text')
                    .attr('class', 'delta-distance horizontal')
                    .attr('x', (d) => (xScale(d.x1) + xScale(d.x2)) / 2)
                    .attr('y', (d) => (yScale(d.y1) + yScale(d.y2)) / 2 + 3)
                    .text((d) => Math.abs(Math.round(d.dx)));    
            }
            else if(WellSpacingDiagram.DISTANCE_RENDER_METHOD == "alternating") {
                const getY = (d) => d.location == 0 ? yScale(d.y2) : yScale(d.y1);

                // Insert text
                enterSelection.insert('text')
                    .attr('class', 'delta-distance horizontal')
                    .attr('x', (d) => (xScale(d.x1) + xScale(d.x2)) / 2)
                    .attr('y', (d) => getY(d) + 3)
                    .text((d) => Math.abs(Math.round(d.dx)));           
            }
        }
    }


    /* ---------------------------------------------------------------------------------------------------- */
    /* CALCULATIONS */

    // Calculate domains
    calculateDomains(groupMap, width, height) {
        const zoomRange = this.#zoomRange;

        // Initialize domain arrays
        const x_domain = [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER];
        const y_domain = [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER];

        // Calculate domains from groups
        // Set min and max for each of x and y axes
        for(const thisGroupName in groupMap) {
            const thisGroup = groupMap[thisGroupName];
            for(const thisData of thisGroup.getData()) {
                x_domain[0] = Math.min(x_domain[0], Math.floor(thisData.x));
                x_domain[1] = Math.max(x_domain[1], Math.ceil(thisData.x));
                y_domain[0] = Math.min(y_domain[0], Math.floor(thisData.y));
                y_domain[1] = Math.max(y_domain[1], Math.ceil(thisData.y));
            }                
        }

        // Create arrays to hold the individual groups by layer type
        const formations = [];
        const wells = [];

        // Sort groups into formations and wells
        for(const thisGroupName in groupMap) {
            const thisGroup = groupMap[thisGroupName];
            if(thisGroup.getType() == WellSpacingDiagram.LAYER_TYPE_FORMATION) {
                formations.push(thisGroup);                
            }
            else if(thisGroup.getType() == WellSpacingDiagram.LAYER_TYPE_WELLS) {
                wells.push(thisGroup);
            }
        }

        // Update domains with zoom range
        if(zoomRange.x.rangeFrom > 0 || zoomRange.x.rangeTo < 1) {
            const x_span = x_domain[1] - x_domain[0];
            const x_fromDelta = x_span * zoomRange.x.rangeFrom;
            const x_toDelta = x_span * (1 - zoomRange.x.rangeTo);
            x_domain[1] = x_domain[1] - x_toDelta;
            x_domain[0] = x_domain[0] + x_fromDelta;
        }

        if(zoomRange.y.rangeFrom > 0 || zoomRange.y.rangeTo < 1) {
            const y_span = y_domain[1] - y_domain[0];
            const y_fromDelta = y_span * zoomRange.y.rangeFrom;
            const y_toDelta = y_span * (1 - zoomRange.y.rangeTo);
            y_domain[1] = y_domain[1] - y_fromDelta;
            y_domain[0] = y_domain[0] + y_toDelta;
        }

        // Applies a padding to x and y axes for wells
        // This will add/subtract 1/2 a standard tick interval to the upper and lower bound
        //   of each domain range
        // Wells use points with radius, this should allow the circles to remain
        //   within the plot area (hopefully)

        // Define x-axis
        const x = d3.scaleLinear()
            .domain(x_domain)
            .range([0, width]);
       
        const x_delta = (x.ticks()[0] - x.ticks()[1]) / 2;
        x_domain[0] = x_domain[0] + x_delta;
        x_domain[1] = x_domain[1] + -1 * x_delta;

        // Define y-axis
        const y = d3.scaleLinear()
            .domain(y_domain)
            .range([height, 0]);

        const y_delta = (y.ticks()[0] - y.ticks()[1]) / 2;
        y_domain[0] = y_domain[0] + y_delta;
        y_domain[1] = y_domain[1] + -1 * y_delta;

        // Return domains and sorted data
        return {
            x_domain: x_domain,
            y_domain: y_domain,
            formations: formations,
            wells: wells
        }
    }

    // Calculate well delta for all group
    calculateWellDeltas(wells) {
        for(const thisWellGroup of wells) {
            const computed = this.calculateWellDeltasForGroup(thisWellGroup.getData());
            thisWellGroup.computed = computed;
        }
    }

    // Calculate well deltas for a well array
    calculateWellDeltasForGroup(data) {
        const configuration = this.#configuration;

        // Sort data by x
        const sorted = [...data].sort((a, b) => a.x - b.x);
        const computed = {
            dh: [],
            dx: [],
            dy: []
        };

        for(let currentIdx = 0; currentIdx < sorted.length - 1; currentIdx++) {
            const thisData = sorted[currentIdx];
            if(this.#distancesLimitToMarked == true && thisData.row.isMarked() == false) continue;

            const distances = [];
            for(let nextIdx = currentIdx + 1; nextIdx < sorted.length; nextIdx++) {
                const nextData = sorted[nextIdx];
                if(this.#distancesLimitToMarked == true && nextData.row.isMarked() == false) continue;
    
                const dx = nextData.x - thisData.x;
                const dy = nextData.y - thisData.y;
                const dh = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
                const distance = {
                    x1: thisData.x,
                    y1: thisData.y,
                    x2: nextData.x,
                    y2: nextData.y,
                    dx: dx,
                    dy: dy,
                    dh: dh,
                    r1: thisData.size == null ? WellSpacingDiagram.WELL_POINT_DEFAULT_SIZE : thisData.size,
                    r2: nextData.size == null ? WellSpacingDiagram.WELL_POINT_DEFAULT_SIZE : nextData.size 
                }
                distances.push(distance);
            }

            // Function to sort and limit neighbors, then copy into specified array
            function reduce(sortFunction, limit, arr) {
                distances.sort(sortFunction);
                const sliced = distances.slice(0, limit);
                for(let slicedIdx = 0; slicedIdx < sliced.length; slicedIdx++) {
                    sliced[slicedIdx].location = slicedIdx % limit;
                }
    
                for(const thisSlice of sliced) {
                    arr.push(thisSlice);
                }
            }

            // Sort and limit neighbors
            reduce((a, b) => a.dh - b.dh, configuration.wellSpacingPerpendicularNeighborLimit, computed.dh);
            reduce((a, b) => a.dh - b.dh, configuration.wellSpacingHorizontalNeighborLimit, computed.dx);
            reduce((a, b) => a.dh - b.dh, configuration.wellSpacingVerticalNeighborLimit, computed.dy);
        }

        return computed;
    }

    /* ---------------------------------------------------------------------------------------------------- */
    /* ACCESSORS */

    // Get margins
    getMargin() {
        const margin = {
            top: WellSpacingDiagram.TOP_MARGIN, 
            right: WellSpacingDiagram.RIGHT_MARGIN, 
            bottom: WellSpacingDiagram.BOTTOM_MARGIN, 
            left: WellSpacingDiagram.LEFT_MARGIN
        };

        return margin;
    }

    /* ---------------------------------------------------------------------------------------------------- */
    /* ACTIONS */

    // Display currently selected distances
    showDistances() {
        const distanceMode = this.#distanceMode;
        const plotAreaElem = this.#plotAreaElem;

        const elems = plotAreaElem.querySelectorAll('g.delta-distance.visible');
        for(const thisNode of elems) {
            thisNode.classList.remove('visible');
        }

        if(distanceMode != null && distanceMode != 'none') {
            const distanceModes = distanceMode.replaceAll(' ', '').split('+');
            for(const thisDistanceMode of distanceModes) {
                const selectedElems = plotAreaElem.querySelectorAll('g.delta-distance.' + thisDistanceMode);
                for(const thisNode of selectedElems) {
                    thisNode.classList.add('visible');
                }
            }
        }
    }

    // Toggle distances based on limit to distance flag
    toggleLimitToDistances() {
        const svgMaskedG = this.#svgMaskedG;
        const wells = this.#wells;
        
        // Re-calculate distance deltas and redraw distance deltas
        this.calculateWellDeltas(wells);
        this.drawWellDistances(svgMaskedG, wells);
        this.showDistances();
    }

    // Event handler for point selection
    pointClick(event, obj) {
        const configuration = this.#configuration;

        if(this.#measuringStickHandler != null && this.#measuringStickHandler.isActive() == true) {
            event.stopPropagation();
            this.#measuringStickHandler.setStart(obj);
        }
        else if(configuration.marking != null) {
            event.stopPropagation();
            if(event.ctrlKey == true)
                obj.row.mark("Toggle");
            else
                obj.row.mark("Replace");
        }
    }

    // Remove measuring stick
    removeMeasuringStick() {
        if(this.#measuringStickHandler != null) {
            this.#measuringStickHandler.removeMeasuringStick();
        }
    }

    // Rectangular selection
    rectangleSelection(selection) {
        const configuration = this.#configuration;
        const plotAreaElem = this.#plotAreaElem;
        const groupMap = this.#groupMap;
        const scales = this.#scales;
        const xScale = scales.xScale;
        const yScale = scales.yScale;

        // Get the SVG element
        const svg = plotAreaElem.querySelector('svg');

        // Convert the selection rectangle coordinates
        const selectionBox = {
            x1: selection.x,
            x2: selection.x + selection.width,
            y1: selection.y,
            y2: selection.y + selection.height,
            offsetLeft: selection.offsetLeft,
            offsetTop: selection.offsetTop
        };

        // Determine if point is inside selection box
        function pointInSelectionBox(svgX, svgY) {
            const point = SVGUtility.svgToScreen(svg, svgX, svgY);
            return point.x >= selectionBox.x1 && point.x <= selectionBox.x2 && 
                point.y >= selectionBox.y1 && point.y <= selectionBox.y2;
        }

        // Initialize an array of selected objects
        const selectedArr = [];

        for(const thisGroupName in groupMap) {
            const thisDataGroup = groupMap[thisGroupName];
            for(const thisData of thisDataGroup.getData()) {
                // Only process if marking enabled for layer type
                if(thisData.layerType == WellSpacingDiagram.LAYER_TYPE_FORMATION && configuration.allowFormationMarking != true)
                    continue;
                if(thisData.layerType == WellSpacingDiagram.LAYER_TYPE_WELLS && configuration.allowWellMarking != true)
                    continue;

                // Calculate svg x and y then test if in the selection box
                const svgX = xScale(thisData.x) - selection.offsetLeft + WellSpacingDiagram.LEFT_MARGIN;
                const svgY = yScale(thisData.y) - selection.offsetTop + WellSpacingDiagram.TOP_MARGIN;
                if(pointInSelectionBox(svgX, svgY) == true) {
                    selectedArr.push(thisData.row);
                }
            }
        }

        return selectedArr;        
    }
}

class PerpendicularDistance {
    static getLabelPositionX(xScale, x1, x2) {
        return (xScale(x1) + xScale(x2)) / 2;
    }

    static getLabelPositionY(yScale, y1, y2) {
        return (yScale(y1) + yScale(y2)) / 2;
    }

    static getLabelTransform(xScale, yScale, x1, x2, y1, y2) {
        const dx = xScale(x2) - xScale(x1);
        const dy = yScale(y2) - yScale(y1);

        const angleRads = Math.atan(dy / dx);
        const angleDeg = angleRads * 180 / Math.PI;

        const transX = 0;
        const transY = 3;

        const labelX = PerpendicularDistance.getLabelPositionX(xScale, x1, x2);
        const labelY = PerpendicularDistance.getLabelPositionY(yScale, y1, y2);
        
        const s = 'rotate(' + angleDeg + ',' + labelX + ',' + labelY + ') translate(' + transX + ',' + transY + ')'; 
        return s;
    }
}

class MeasuringStickHandler {
    static MEASURING_STICK_MODES = ['perpendicular', 'right-angle'];

    // Declare properties set in constructor
    #toolbarElem;
    #plotAreaElem;
    #margin;
    #svg;
    #svgTargetG;
    #scales;
    #measuringStick;

    constructor() {
    }

    /* ---------------------------------------------------------------------------------------------------- */
    /* DRAW COMPONENTS */

    // Draw toggle buttons on the toolbar
    drawToggleButtons(toolbarElem) {
        const self = this;

        // Measuring stick perpendicular toggle
        const measuringStickPerpendicularElem = document.createElement('button');
        measuringStickPerpendicularElem.classList.add('measuring-stick-toggle');
        measuringStickPerpendicularElem.classList.add('perpendicular');
        measuringStickPerpendicularElem.innerHTML = '<img src="images/straight-line.png"/>';
        toolbarElem.appendChild(measuringStickPerpendicularElem);

        measuringStickPerpendicularElem.addEventListener('mousedown', (e) => e.stopPropagation());
        measuringStickPerpendicularElem.addEventListener('click', (e) => {
            e.stopPropagation();
            self.toggleMeasuringStick('perpendicular', toolbarElem);
        });

        // Measuring stick right-angle toggle
        const measuringStickRightAngleElem = document.createElement('button');
        measuringStickRightAngleElem.classList.add('measuring-stick-toggle');
        measuringStickRightAngleElem.classList.add('right-angle');
        measuringStickRightAngleElem.innerHTML = '<img src="images/right-angle.png"/>';
        toolbarElem.appendChild(measuringStickRightAngleElem);

        measuringStickRightAngleElem.addEventListener('mousedown', (e) => e.stopPropagation());
        measuringStickRightAngleElem.addEventListener('click', (e) => {
            e.stopPropagation();
            self.toggleMeasuringStick('right-angle', toolbarElem);
        });
    }

    // Draw measuring stick
    drawMeasuringStick(event) {
        if(this.#measuringStick.start == null) return;

        if(this.#measuringStick.mode == 'perpendicular') {
            this.drawMeasuringStickPerpendicular(event);
        }
        else if(this.#measuringStick.mode == 'right-angle') {
            this.drawMeasuringStickRightAngle(event);
        }
    }

    // Draw perpendicular measuring stick
    drawMeasuringStickPerpendicular(event) {
        const svg = this.#svg;
        const svgTargetG = this.#svgTargetG;
        const margin = this.#margin
        const scales = this.#scales;
        const xScale = scales.xScale;
        const yScale = scales.yScale;

        if(this.#measuringStick.created == null) {
            const groupSelection = svgTargetG.append('g');
            groupSelection.attr('class', 'measuring-stick');
            
            this.#measuringStick.line = groupSelection.append('line')
                .attr('class', 'measuring-stick perpendicular')

            this.#measuringStick.text = groupSelection.append('text')
                .attr('class', 'measuring-stick perpendicular')
            
            this.#measuringStick.created = true;
        }

        // Set start and end
        const start = this.#measuringStick.start;
        let end = this.#measuringStick.end;
        if(end == null || end == start) {
            const svgPoint = SVGUtility.screenToSVG(svg.node(), event.x, event.y);
            end = {
                x: xScale.invert(svgPoint.x - margin.left),
                y: yScale.invert(svgPoint.y - margin.top)
            }
        }

        // Calculate distance
        const distance = Math.round(Math.sqrt(Math.pow(start.x - end.x, 2) + Math.pow(start.y - end.y, 2)));

        // Update position
        this.#measuringStick.line
            .attr('x1', xScale(start.x))
            .attr('y1', yScale(start.y))
            .attr('x2', xScale(end.x))
            .attr('y2', yScale(end.y));

        this.#measuringStick.text
            .attr('x', PerpendicularDistance.getLabelPositionX(xScale, start.x, end.x))
            .attr('y', PerpendicularDistance.getLabelPositionY(yScale, start.y, end.y))
            .attr('transform', PerpendicularDistance.getLabelTransform(xScale, yScale, start.x, end.x, start.y, end.y))
            .text(distance);
    }

    // Draw right-angle measuring stick
    drawMeasuringStickRightAngle(event) {
        const svg = this.#svg;
        const svgTargetG = this.#svgTargetG;
        const margin = this.#margin
        const scales = this.#scales;
        const xScale = scales.xScale;
        const yScale = scales.yScale;

        if(this.#measuringStick.created == null) {
            const groupSelection = svgTargetG.append('g');
            groupSelection.attr('class', 'measuring-stick');
            
            this.#measuringStick.verticalLine = groupSelection.append('line')
                .attr('class', 'measuring-stick horizontal boundary')

            this.#measuringStick.horizontalLine = groupSelection.append('line')
                .attr('class', 'measuring-stick horizontal')

            this.#measuringStick.textX = groupSelection.append('text')
                .attr('class', 'measuring-stick horizontal')
            
            this.#measuringStick.textY = groupSelection.append('text')
                .attr('class', 'measuring-stick vertical')
            
            this.#measuringStick.created = true;
        }

        // Set start and end
        const start = this.#measuringStick.start;
        let end = this.#measuringStick.end;
        if(end == null || end == start) {
            const svgPoint = SVGUtility.screenToSVG(svg.node(), event.x, event.y);
            end = {
                x: xScale.invert(svgPoint.x - margin.left),
                y: yScale.invert(svgPoint.y - margin.top)
            }
        }

        // Calculate distance
        const distanceX = Math.round(Math.abs(end.x - start.x));
        const distanceY = Math.round(Math.abs(end.y - start.y));

        // Update position
        this.#measuringStick.verticalLine
            .attr('x1', xScale(start.x))
            .attr('y1', yScale(start.y))
            .attr('x2', xScale(start.x))
            .attr('y2', yScale(end.y) + (end.y < start.y ? 1 : -1) * 2);

        this.#measuringStick.horizontalLine
            .attr('x1', xScale(start.x))
            .attr('y1', yScale(end.y))
            .attr('x2', xScale(end.x))
            .attr('y2', yScale(end.y));

        this.#measuringStick.textX
            .attr('x', (xScale(start.x) + xScale(end.x)) / 2)
            .attr('y', yScale(end.y) + 3)
            .text(distanceX);

        this.#measuringStick.textY
            .attr('x', xScale(start.x))
            .attr('y', (yScale(start.y) + yScale(end.y)) / 2)
            .attr('transform', 'rotate(' + 270 + ',' + xScale(start.x) + ',' + (yScale(start.y) + yScale(end.y)) / 2 + ') translate(' + 0 + ',' + 3 + ')')                        
            .text(distanceY);
    }


    /* ---------------------------------------------------------------------------------------------------- */
    /* ACCESSORS */

    // Sets the plot area and margins
    setPlotArea(plotAreaElem, margin) {
        this.#plotAreaElem = plotAreaElem;
        this.#margin = margin;
    }

    // Sets the SVG element for drawing the stick and the scales
    setSVG(svg, svgTargetG, scales) {
        this.#svg = svg;
        this.#svgTargetG = svgTargetG;
        this.#scales = scales;
    }

    // Sets the start object
    setStart(obj) {
        this.#measuringStick.start = obj;
    }

    // Sets the end object
    setEnd(obj) {
        this.#measuringStick.end = obj;
    }

    // Returns true if measuring stick is active
    isActive() {
        return this.#measuringStick != null;
    }

    /* ---------------------------------------------------------------------------------------------------- */
    /* ACTIONS */

    // Toggle measuring stick
    toggleMeasuringStick(mode, toolbarElem) {
        const self = this;
        
        const plotAreaElem = this.#plotAreaElem;
        const svgTargetG = this.#svgTargetG;
        this.#toolbarElem = toolbarElem;

        const measuringStickElems = toolbarElem.querySelectorAll('.measuring-stick-toggle'); 
        for(const thisElem of measuringStickElems) {
            thisElem.classList.remove('active');
        }

        const measuringStickElem = toolbarElem.querySelector('.measuring-stick-toggle.' + mode);
        if(this.#measuringStick == null) {
            measuringStickElem.classList.add('active');
            this.#measuringStick = {
                mode: mode,
                mouseMove: (event) => self.drawMeasuringStick(event)
            }
            plotAreaElem.addEventListener('mousemove', this.#measuringStick.mouseMove);
        }
        else if(this.#measuringStick.mode != mode) {
            measuringStickElem.classList.add('active');
            this.#measuringStick.mode = mode;
            this.#measuringStick.created = null;
            svgTargetG.select('g.measuring-stick').remove(); 
        }
        else {
            this.removeMeasuringStick();
        }
    }

    // Removes the measuring stick
    removeMeasuringStick() {
        const plotAreaElem = this.#plotAreaElem;
        const toolbarElem = this.#toolbarElem;
        const svgTargetG = this.#svgTargetG;

        // Select the UI measuring stick and remove it
        svgTargetG.select('g.measuring-stick').remove();

        // Remove active class from the button
        const measuringStickActiveElem = toolbarElem.querySelector('.measuring-stick-toggle.active');
        if(measuringStickActiveElem != null) {
            measuringStickActiveElem.classList.remove('active');
        }
        
        // Remove the event listener for mouse move
        plotAreaElem.removeEventListener('mousemove', this.#measuringStick.mouseMove);

        // Remove the measuring stick config
        this.#measuringStick = null;
    }
}
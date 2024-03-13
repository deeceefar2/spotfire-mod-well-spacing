/*
 * Copyright © 2024. Cloud Software Group, Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

class WellSpacingDiagram {
    static DEFAULT_COLOR = '#FAA264';
    static DISTANCE_RENDER_METHOD = "alternating"; //"center" | "alternating"
    static NEIGHBOR_LIMIT = 2;
    static FORMATION_POINT_DEFAULT_SIZE = 3;
    static WELL_POINT_DEFAULT_SIZE = 7;

    static TOP_MARGIN = 10;
    static RIGHT_MARGIN = 30;
    static BOTTOM_MARGIN = 30;
    static LEFT_MARGIN = 60;

    constructor(canvasElem, actions) {
        this.canvasElem = canvasElem;
        this.actions = actions;

        // Create diagram element and append
        let diagramElem = document.createElement('div');
        diagramElem.classList.add('well-spacing-diagram');
        canvasElem.appendChild(diagramElem);

        // Set diagram element
        this.diagramElem = diagramElem;

        // Initialize flag for distance limit to marking
        this.distancesLimitToMarked = false;
    }

    /* ---------------------------------------------------------------------------------------------------- */
    /* DRAW COMPONENTS */
    // Draw main
    draw(groupMap, configuration) {
        // Set the updated configuration
        this.configuration = configuration;

        // Get the diagram element
        let diagramElem = this.diagramElem

        // Clear contents
        diagramElem.innerHTML = '';

        // Create callback function for limiting distances
        let self = this;
        let limitDistancesCallback = function() {
            // Re-calculate distance deltas and redraw distance deltas
            self.calculateDeltas(wells);
            self.drawDistances(svg, xScale, yScale, wells);
            self.showDistances(self.distanceMode);
        }

        // Draw the toolbar and plot area elements
        let toolbarElem = this.drawToolbar(diagramElem, limitDistancesCallback);
        let plotAreaElem = this.drawPlotArea(diagramElem);

        // Set margins, height, width
        const margin = {
            top: WellSpacingDiagram.TOP_MARGIN, 
            right: WellSpacingDiagram.RIGHT_MARGIN, 
            bottom: WellSpacingDiagram.BOTTOM_MARGIN, 
            left: WellSpacingDiagram.LEFT_MARGIN
        };
        const width = plotAreaElem.clientWidth - margin.left - margin.right;
        const height = plotAreaElem.clientHeight - margin.top - margin.bottom;
    
        // Build data
        let calcDomainsResult = this.calculateDomains(groupMap, width, height);
        let formations = calcDomainsResult.formations;
        this.formations = formations;

        let wells = calcDomainsResult.wells;
        this.wells = wells;

        // Draw SVG
        let svg = d3.select(plotAreaElem)
            .append('svg')
                .attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom)
            .append('g')
                .attr('transform',
                    'translate(' + margin.left + ',' + margin.top + ')');

        // Draw axis scales
        let scales = this.drawScales(svg, calcDomainsResult.x_domain, calcDomainsResult.y_domain, width, height);
        this.scales = scales;
        let xScale = scales.xScale;
        let yScale = scales.yScale;

        // Add formations
        this.drawFormations(svg, xScale, yScale, formations);

        // Calculate distance deltas
        this.calculateDeltas(wells);
        
        // Draw distance deltas
        this.drawDistances(svg, xScale, yScale, wells);

        // Draw wells
        this.drawWells(svg, xScale, yScale, wells, plotAreaElem);

        // Append event handlers
        this.appendEventHandlers(svg, xScale, yScale, margin, plotAreaElem, wells);        
        
        // Set markable class if marking enabled
        if(configuration.marking != null) {
            diagramElem.classList.add('markable');
        }
        else {
            diagramElem.classList.remove('markable');
        }

        // Show selected distances
        this.showDistances(this.distanceMode);
    }

    // Draw toolbar
    drawToolbar(diagramElem, limitDistancesCallback) {
        let toolbarElem = document.createElement('div');
        toolbarElem.classList.add('toolbar');
        diagramElem.appendChild(toolbarElem);

        // Append select for displaying distances
        let selectLabelElem = document.createElement('div');
        selectLabelElem.classList.add('distance-select-label');
        selectLabelElem.innerHTML = 'Show Distances';
        toolbarElem.appendChild(selectLabelElem);

        let selectElem = document.createElement('select');
        toolbarElem.appendChild(selectElem);

        let opts = ['None', 'Horizontal', 'Perpendicular', 'Vertical', 'Vertical + Horizontal'];
        for(let thisEnumItem of opts) {
            let optionElem = document.createElement('option');
            optionElem.innerHTML = thisEnumItem;
            if(thisEnumItem.toLocaleLowerCase() == this.distanceMode) {
                optionElem.setAttribute('selected', true);
            }
            selectElem.appendChild(optionElem);
        }

        // On change of select element, show/hide appropriate distances
        let self = this;
        selectElem.onchange = function(event) {
            self.distanceMode = selectElem.value.toLowerCase();
            self.showDistances(self.distanceMode);
        }


        // Append checkbox for limit to marking
        let checkboxElem = document.createElement('input');
        checkboxElem.setAttribute('type', 'checkbox');
        checkboxElem.checked = this.distancesLimitToMarked;
        toolbarElem.appendChild(checkboxElem);

        let limitMarkingLabelElem = document.createElement('div');
        limitMarkingLabelElem.classList.add('distance-select-label');
        limitMarkingLabelElem.innerHTML = 'Limit to Marked Rows';
        toolbarElem.appendChild(limitMarkingLabelElem);

        // On change of select element, show/hide appropriate distances
        checkboxElem.onchange = function(event) {
            self.distancesLimitToMarked = event.target.checked;
            limitDistancesCallback();
            //self.calculateDeltas(self.wells);
            //self.showDistances(self.distanceMode);
            //self.distanceMode = selectElem.value.toLowerCase();
            //self.showDistances(self.distanceMode);
        }



        // Measuring stick
        let measuringStickPerpendicularElem = document.createElement('button');
        measuringStickPerpendicularElem.classList.add('measuring-stick-toggle');
        measuringStickPerpendicularElem.classList.add('perpendicular');
        measuringStickPerpendicularElem.innerHTML = '<img src="images/straight-line.png"/>';
        toolbarElem.appendChild(measuringStickPerpendicularElem);

        let measuringStickHorizontalElem = document.createElement('button');
        measuringStickHorizontalElem.classList.add('measuring-stick-toggle');
        measuringStickHorizontalElem.classList.add('horizontal');
        measuringStickHorizontalElem.innerHTML = '<img src="images/right-angle.png"/>';
        toolbarElem.appendChild(measuringStickHorizontalElem);


        /*let measuringStickVerticalElem = document.createElement('button');
        measuringStickVerticalElem.classList.add('measuring-stick-toggle');
        measuringStickVerticalElem.classList.add('vertical');
        measuringStickVerticalElem.innerHTML = 'V';
        toolbarElem.appendChild(measuringStickVerticalElem);*/

        return toolbarElem;
    }

    // Draw plot area
    drawPlotArea(diagramElem) {
        let plotAreaElem = document.createElement('div');
        plotAreaElem.classList.add('plot-area');
        diagramElem.appendChild(plotAreaElem);

        return plotAreaElem;
    }

    // Compute scales and draw x and y axis
    drawScales(svg, x_domain, y_domain, width, height) {
        let configuration = this.configuration;

        // Define and append x-axis
        let xScale = d3.scaleLinear()
            .domain(x_domain)
            .range([0, width]);
       
        svg.append('g')
            .attr('class', 'scale scale-x')
            .attr('transform', 'translate(0,' + height + ')')
            .call(d3.axisBottom(xScale));                    
        
        
        // Define and append y-axis
        let yScale = d3.scaleLinear()
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
                        .attr('y1', function(d) { return yScale(d) })
                        .attr('y2', function(d) { return yScale(d) });
        }

        return {
            xScale: xScale,
            yScale: yScale
        }
    }

    // Draw formation lines
    drawFormations(svg, xScale, yScale, formations) {
        if(formations.length == 0) return;

        let configuration = this.configuration;

        let groupSelection = svg.append('g');
        groupSelection.attr('class', 'formations');

        // Iterate over each formation group and draw
        for(let thisFormationGroup of formations) {
            // Draw formation as line and circles for marking
            // Sort the lines into start and end
            let lines = [];
            for(let idx = 0; idx < thisFormationGroup.data.length - 1; idx++) {
                let thisLine = {
                    start: thisFormationGroup.data[idx],
                    end: thisFormationGroup.data[idx + 1]
                }
                lines.push(thisLine);
            }

            // Append formation lines
            groupSelection
                .selectAll('formation')
                .data(lines)
                .enter()
                    .append('line')
                        .attr('class', 'formation selectable')
                        .attr('stroke', function(d) {
                            let color = d.start.color;
                            if(d.start.row.isMarked() != d.end.row.isMarked() && d.end.row.isMarked() == false)
                                color = d.end.color;
                            return color;
                        })
                        .attr('stroke-width', configuration.strokeWidth)
                        .attr('stroke-dasharray', configuration.strokeDashArray)
                        .attr("x1", function(d) {return xScale(d.start.x);})
                        .attr("y1", function(d) {return yScale(d.start.y);})
                        .attr("x2", function(d) {return xScale(d.end.x);})
                        .attr("y2", function(d) {return yScale(d.end.y);});                

            // Append formation circles
            groupSelection
                .selectAll('formation')
                .data(thisFormationGroup.data)
                .enter()
                    .append('circle')
                        .attr('class', 'formation-circle selectable')
                        .attr('cx', function (d) { return xScale(d.x); } )
                        .attr('cy', function (d) { return yScale(d.y); } )
                        .attr('r', function (d) { return d.size == null ? WellSpacingDiagram.FORMATION_POINT_DEFAULT_SIZE : d.size })
                        .attr('stroke', 'lightgrey')
                        .attr('stroke-width', function (d) { return d.row.isMarked() == true ? 1 : 0; })
                        .style('fill', function (d) { return d.row.isMarked() == true ? d.color : 'transparent'; })

            // Draw formation as path for no marking
            /*groupSelection
                .append('path')
                .attr('class', 'formation')
                .datum(thisFormationGroup.data)
                    .attr('fill', 'none')
                    .attr('stroke', thisFormationGroup.color)
                    .attr('stroke-width', configuration.strokeWidth)
                    .attr('stroke-dasharray', configuration.strokeDashArray)
                    .attr('d', d3.line()
                        .x(function(d) { return xScale(d.x) })
                        .y(function(d) { return yScale(d.y) })
                    );  */        
        }
    }

    // Draw all distance types
    drawDistances(svg, xScale, yScale, wells) {
        // Remove existing   
        let groupSelection = svg.select('g.distances').remove();

        // If no wells, just return
        if(wells.length == 0) return;

        // Create new group
        groupSelection = svg.append('g');
        groupSelection.attr('class', 'distances');

        // Draw perpendicular distances
        this.drawPerpendicularDistances(groupSelection, xScale, yScale, wells);

        // Draw vertical distances
        this.drawVerticalDistances(groupSelection, xScale, yScale, wells);

        // Draw horizontal distances
        this.drawHorizontalDistances(groupSelection, xScale, yScale, wells);

    }

    // Draw perpendicular distances
    drawPerpendicularDistances(parentSelection, xScale, yScale, wells) {
        let groupSelection = parentSelection.append('g');
        groupSelection.attr('class', 'distance perpendicular');

        // Add well deltas
        for(let thisWellGroup of wells) {
            if(thisWellGroup.computed == null) continue;
            let enterSelection = groupSelection.append('g')
                .attr('class', 'delta-distance perpendicular')
                .selectAll('well-perpendicular')      
                .data(thisWellGroup.computed)
                .enter();

            // Append line
            enterSelection.append('line')
                .attr('class', 'delta-distance perpendicular')
                .attr('x1', function(d) { return xScale(d.x1) })
                .attr('x2', function(d) { return xScale(d.x2) })
                .attr('y1', function(d) { return yScale(d.y1) })
                .attr('y2', function(d) { return yScale(d.y2) });

            // Insert text
            enterSelection.insert('text')
                .attr('class', 'delta-distance perpendicular')
                .attr('x', function(d) { return PerpendicularDistance.getLabelPositionX(xScale, d.x1, d.x2) })
                .attr('y', function(d) { return PerpendicularDistance.getLabelPositionY(yScale, d.y1, d.y2) })
                .attr('transform', function(d) { return PerpendicularDistance.getLabelTransform(xScale, yScale, d.x1, d.x2, d.y1, d.y2) })
                .text(function(d) { return Math.round(d.dh) });
        }
    }

    // Draw vertical distances
    drawVerticalDistances(parentSelection, xScale, yScale, wells) {
        let groupSelection = parentSelection.append('g');
        groupSelection.attr('class', 'distance vertical');

        for(let thisWellGroup of wells) {
            if(thisWellGroup.computed == null) continue;
            let enterSelection = groupSelection.append('g')
                .attr('class', 'delta-distance vertical')
                .selectAll('well-vertical')      
                .data(thisWellGroup.computed)
                .enter();

            if(WellSpacingDiagram.DISTANCE_RENDER_METHOD == "center") {
                // Append vertical line at mid point betweek points
                enterSelection.append('line')
                    .attr('class', 'delta-distance vertical')
                    .attr('x1', function(d) { return (xScale(d.x1) + xScale(d.x2)) / 2 })
                    .attr('x2', function(d) { return (xScale(d.x1) + xScale(d.x2)) / 2 })
                    .attr('y1', function(d) { return yScale(d.y1) })
                    .attr('y2', function(d) { return yScale(d.y2) });

                // Insert horizontal lines from start
                enterSelection.insert('line')
                    .attr('class', 'delta-distance vertical boundary')
                    .attr('x1', function(d) { return xScale(d.x1) + d.r1 + 3 })
                    .attr('x2', function(d) { return (xScale(d.x1) + xScale(d.x2)) / 2 + 3 })
                    .attr('y1', function(d) { return yScale(d.y1) })
                    .attr('y2', function(d) { return yScale(d.y1) });

                // Insert horizontal lines from end
                enterSelection.insert('line')
                    .attr('class', 'delta-distance vertical boundary')
                    .attr('x1', function(d) { return (xScale(d.x1) + xScale(d.x2)) / 2 - 3 })
                    .attr('x2', function(d) { return xScale(d.x2) + d.r2 - 3 })
                    .attr('y1', function(d) { return yScale(d.y2) })
                    .attr('y2', function(d) { return yScale(d.y2) });

                // Insert text
                enterSelection.insert('text')
                    .attr('class', 'delta-distance vertical')
                    .attr('x', function(d) { return (xScale(d.x1) + xScale(d.x2)) / 2 })
                    .attr('y', function(d) { return (yScale(d.y1) + yScale(d.y2)) / 2 })
                    .attr('transform', function(d) { return 'rotate(' + 270 + ',' + (xScale(d.x1) + xScale(d.x2)) / 2 + ',' + (yScale(d.y1) + yScale(d.y2)) / 2 + ') translate(' + 0 + ',' + 3 + ')';  })                        
                    .text(function(d) { return Math.abs(Math.round(d.dy)) });
            }
            else if(WellSpacingDiagram.DISTANCE_RENDER_METHOD == "alternating") {                
                let getX = function(d) {
                    return d.location == 0 ? xScale(d.x1) : xScale(d.x2);
                }

                let getY = function(d) {
                    return d.location == 0 ? yScale(d.y2) : yScale(d.y1);
                }

                // Append vertical line
                enterSelection.append('line')
                    .attr('class', 'delta-distance vertical')
                    .attr('x1', function(d) { return getX(d) })
                    .attr('x2', function(d) { return getX(d) })
                    .attr('y1', function(d) { return yScale(d.y1) })
                    .attr('y2', function(d) { return yScale(d.y2) });                

                // Insert horizontal line from end
                enterSelection.insert('line')
                    .attr('class', 'delta-distance vertical boundary')
                    .attr('x1', function(d) { return xScale(d.x1) })
                    .attr('x2', function(d) { return xScale(d.x2) })
                    .attr('y1', function(d) { return getY(d) })
                    .attr('y2', function(d) { return getY(d) });

                // Insert text
                enterSelection.insert('text')
                    .attr('class', 'delta-distance vertical')
                    .attr('x', function(d) { return getX(d) })
                    .attr('y', function(d) { return (yScale(d.y1) + yScale(d.y2)) / 2 })
                    .attr('transform', function(d) { return 'rotate(' + 270 + ',' + getX(d) + ',' + (yScale(d.y1) + yScale(d.y2)) / 2 + ') translate(' + 0 + ',' + 3 + ')';  })                        
                    .text(function(d) { return Math.abs(Math.round(d.dy)) });
            }
        }
    }

    // Draw horizontal distances
    drawHorizontalDistances(parentSelection, xScale, yScale, wells) {
        let groupSelection = parentSelection.append('g');
        groupSelection.attr('class', 'distance horizontal');

        for(let thisWellGroup of wells) {
            if(thisWellGroup.computed == null) continue;
            let enterSelection = groupSelection.append('g')
                .attr('class', 'delta-distance horizontal')
                .selectAll('well-horizontal')      
                .data(thisWellGroup.computed)
                .enter();

            if(WellSpacingDiagram.DISTANCE_RENDER_METHOD == "center") {
                // Append horitonzal line at mid point betweek points
                enterSelection.append('line')
                    .attr('class', 'delta-distance horizontal')
                    .attr('x1', function(d) { return xScale(d.x1) })
                    .attr('x2', function(d) { return xScale(d.x2) })
                    .attr('y1', function(d) { return (yScale(d.y1) + yScale(d.y2)) / 2 })
                    .attr('y2', function(d) { return (yScale(d.y1) + yScale(d.y2)) / 2 });

                // Insert vertical line from start
                enterSelection.insert('line')
                    .attr('class', 'delta-distance horizontal boundary')
                    .attr('x1', function(d) { return xScale(d.x1) })
                    .attr('x2', function(d) { return xScale(d.x1) })
                    .attr('y1', function(d) { return yScale(d.y1) + (d.y1 > d.y2 ? 1 : -1) * (d.r1 + 2) })
                    .attr('y2', function(d) { return (yScale(d.y1) + yScale(d.y2)) / 2 + (d.y1 > d.y2 ? 1 : -1) * 2 });

                // Insert vertical line from end
                enterSelection.insert('line')
                    .attr('class', 'delta-distance horizontal boundary')
                    .attr('x1', function(d) { return xScale(d.x2) })
                    .attr('x2', function(d) { return xScale(d.x2) })
                    .attr('y1', function(d) { return yScale(d.y2) + + (d.y1 < d.y2 ? 1 : -1) * (d.r2 + 2) })
                    .attr('y2', function(d) { return (yScale(d.y1) + yScale(d.y2)) / 2 + (d.y1 < d.y2 ? 1 : -1) * 2 });

                    
                // Insert text
                enterSelection.insert('text')
                    .attr('class', 'delta-distance horizontal')
                    .attr('x', function(d) { return (xScale(d.x1) + xScale(d.x2)) / 2 })
                    .attr('y', function(d) { return (yScale(d.y1) + yScale(d.y2)) / 2 + 3 })
                    .text(function(d) { return Math.abs(Math.round(d.dx)) });    
            }
            else if(WellSpacingDiagram.DISTANCE_RENDER_METHOD == "alternating") {
                let getX = function(d) {
                    return d.location == 0 ? xScale(d.x1) : xScale(d.x2);
                }

                let getY = function(d) {
                    return d.location == 0 ? yScale(d.y2) : yScale(d.y1);
                }

                // Append horitonzal line 
                enterSelection.append('line')
                    .attr('class', 'delta-distance horizontal')
                    .attr('x1', function(d) { return xScale(d.x1) })
                    .attr('x2', function(d) { return xScale(d.x2) })
                    .attr('y1', function(d) { return getY(d) })
                    .attr('y2', function(d) { return getY(d) }); 
                    
                // Insert vertical line from end
                enterSelection.insert('line')
                    .attr('class', 'delta-distance horizontal boundary')
                    .attr('x1', function(d) { return getX(d) })
                    .attr('x2', function(d) { return getX(d) })
                    .attr('y1', function(d) { return yScale(d.y2) })
                    .attr('y2', function(d) { return yScale(d.y1) });

                // Insert text
                enterSelection.insert('text')
                    .attr('class', 'delta-distance horizontal')
                    .attr('x', function(d) { return (xScale(d.x1) + xScale(d.x2)) / 2 })
                    .attr('y', function(d) { return getY(d) + 3 })
                    .text(function(d) { return Math.abs(Math.round(d.dx)) });           
            }
        }
    }

    // Draw well points
    drawWells(svg, xScale, yScale, wells, plotAreaElem) {
        if(wells.length == 0) return;

        let groupSelection = svg.append('g');
        groupSelection.attr('class', 'wells');

        let self = this;

        // Create function to mouse over well
        let mouseOverWell = function(event, obj) {
            event.stopPropagation(); 
            
            // If measuring stick is active, append this as an end for snap
            // No tooltip is shown because it interferes with the measuring stick
            if(self.measuringStick != null) {
                self.measuringStick.end = obj;
            }
            // Otherwise show the tooltip
            else {
                self.actions.showTooltip(obj.row);
            }
        }
    
        // Create function for mouse out of well
        let mouseOutWell = function(event) {
            event.stopPropagation();
    
            // Unsnap end of measuring stick
            if(self.measuringStick != null) {
                self.measuringStick.end = null;
            }
            self.actions.hideTooltip();
        }
    
        // Iterate over the well groups
        for(let thisWellGroup of wells) {
            groupSelection
                .selectAll('well')
                .data(thisWellGroup.data)
                .enter()
                    .append('circle')
                        .attr('class', 'well selectable')
                        .attr('cx', function (d) { return xScale(d.x); } )
                        .attr('cy', function (d) { return yScale(d.y); } )
                        .attr('r', function (d) { return d.size == null ? WellSpacingDiagram.WELL_POINT_DEFAULT_SIZE : d.size })
                        .style('fill', function (d) { return d.color == null ? WellSpacingDiagram.DEFAULT_COLOR : d.color })
                        .on('mouseover', function(event, d) { mouseOverWell(event, d); })
                        .on('mouseout', function(event, d) { mouseOutWell(event); })
                        .on('click', function(event, d) { event.stopPropagation(); self.pointClick(event, d) });
                        //.append("svg:title")
                        //    .text(function(d) { return `x:${d.x} y:${d.y}`; });
        }
    }

    // Draw measuring stick
    drawMeasuringStick(event, svg, xScale, yScale, margin) {
        if(this.measuringStick.start == null) return;

        if(this.measuringStick.mode == 'perpendicular') {
            this.drawMeasuringStickPerpendicular(event, svg, xScale, yScale, margin);
        }
        else if(this.measuringStick.mode == 'horizontal') {
            this.drawMeasuringStickHorizontal(event, svg, xScale, yScale, margin);
        }
        else if(this.measuringStick.mode == 'vertical') {
            this.drawMeasuringStickVertical(event, svg, xScale, yScale, margin);
        }
    }

    // Draw perpendicular measuring stick
    drawMeasuringStickPerpendicular(event, svg, xScale, yScale, margin) {
        if(this.measuringStick.created == null) {
            let groupSelection = svg.append('g');
            groupSelection.attr('class', 'measuring-stick');
            
            this.measuringStick.line = groupSelection.append('line')
                .attr('class', 'measuring-stick perpendicular')

            this.measuringStick.text = groupSelection.append('text')
                .attr('class', 'measuring-stick perpendicular')
            
            this.measuringStick.created = true;
        }

        // Set start and end
        let start = this.measuringStick.start;
        let end = this.measuringStick.end;
        if(end == null || end == start) {
            end = {
                x: xScale.invert(event.pageX - margin.left),
                y: yScale.invert(event.pageY - 5 * margin.top)
            }
        }

        // Calculate distance
        let distance = Math.round(Math.sqrt(Math.pow(start.x - end.x, 2) + Math.pow(start.y - end.y, 2)));

        // Update position
        this.measuringStick.line
            .attr('x1', xScale(start.x))
            .attr('y1', yScale(start.y))
            .attr('x2', xScale(end.x))
            .attr('y2', yScale(end.y));

        this.measuringStick.text
            .attr('x', PerpendicularDistance.getLabelPositionX(xScale, start.x, end.x))
            .attr('y', PerpendicularDistance.getLabelPositionY(yScale, start.y, end.y))
            .attr('transform', PerpendicularDistance.getLabelTransform(xScale, yScale, start.x, end.x, start.y, end.y))
            .text(distance);
    }

    // Draw horizontal measuring stick
    drawMeasuringStickHorizontal(event, svg, xScale, yScale, margin) {
        if(this.measuringStick.created == null) {
            let groupSelection = svg.append('g');
            groupSelection.attr('class', 'measuring-stick');
            
            this.measuringStick.verticalLine = groupSelection.append('line')
                .attr('class', 'measuring-stick horizontal boundary')

            this.measuringStick.horizontalLine = groupSelection.append('line')
                .attr('class', 'measuring-stick horizontal')

            this.measuringStick.textX = groupSelection.append('text')
                .attr('class', 'measuring-stick horizontal')
            
            this.measuringStick.textY = groupSelection.append('text')
                .attr('class', 'measuring-stick vertical')
            
            this.measuringStick.created = true;
        }

        // Set start and end
        let start = this.measuringStick.start;
        let end = this.measuringStick.end;
        if(end == null || end == start) {
            end = {
                x: xScale.invert(event.pageX - margin.left),
                y: yScale.invert(event.pageY - 5 * margin.top)
            }
        }

        // Calculate distance
        let distanceX = Math.round(Math.abs(end.x - start.x));
        let distanceY = Math.round(Math.abs(end.y - start.y));

        // Update position
        this.measuringStick.verticalLine
            .attr('x1', xScale(start.x))
            .attr('y1', yScale(start.y))
            .attr('x2', xScale(start.x))
            .attr('y2', yScale(end.y) + (end.y < start.y ? 1 : -1) * 2);

        this.measuringStick.horizontalLine
            .attr('x1', xScale(start.x))
            .attr('y1', yScale(end.y))
            .attr('x2', xScale(end.x))
            .attr('y2', yScale(end.y));

        this.measuringStick.textX
            .attr('x', (xScale(start.x) + xScale(end.x)) / 2)
            .attr('y', yScale(end.y) + 3)
            .text(distanceX);

        this.measuringStick.textY
            .attr('x', xScale(start.x))
            .attr('y', (yScale(start.y) + yScale(end.y)) / 2)
            .attr('transform', 'rotate(' + 270 + ',' + xScale(start.x) + ',' + (yScale(start.y) + yScale(end.y)) / 2 + ') translate(' + 0 + ',' + 3 + ')')                        
            .text(distanceY);
    }

    // Draw perpendicular measuring stick
    drawMeasuringStickVertical(event, svg, xScale, yScale, margin) {
        if(this.measuringStick.created == null) {
            let groupSelection = svg.append('g');
            groupSelection.attr('class', 'measuring-stick');
            
            this.measuringStick.verticalLine = groupSelection.append('line')
                .attr('class', 'measuring-stick vertical')

            this.measuringStick.horizontalLine = groupSelection.append('line')
                .attr('class', 'measuring-stick vertical boundary')

            this.measuringStick.text = groupSelection.append('text')
                .attr('class', 'measuring-stick perpendicular')
            
            this.measuringStick.created = true;
        }

        // Set start and end
        let start = this.measuringStick.start;
        let end = this.measuringStick.end;
        if(end == null || end == start) {
            end = {
                x: xScale.invert(event.pageX - margin.left),
                y: yScale.invert(event.pageY - 5 * margin.top)
            }
        }

        // Calculate distance
        let distance = Math.round(Math.abs(end.y - start.y));

        // Update position
        this.measuringStick.verticalLine
            .attr('x1', xScale(end.x))
            .attr('y1', yScale(start.y))
            .attr('x2', xScale(end.x))
            .attr('y2', yScale(end.y));

        this.measuringStick.horizontalLine
            .attr('x1', xScale(start.x))
            .attr('y1', yScale(start.y))
            .attr('x2', xScale(end.x) + (end.x > start.x ? 1 : -1) * 2)
            .attr('y2', yScale(start.y));

        this.measuringStick.text
            .attr('x', xScale(end.x))
            .attr('y', (yScale(start.y) + yScale(end.y)) / 2)
            .attr('transform', 'rotate(' + 270 + ',' + xScale(end.x) + ',' + (yScale(start.y) + yScale(end.y)) / 2 + ') translate(' + 0 + ',' + 3 + ')')                        
            .text(distance);
    }

    /* ---------------------------------------------------------------------------------------------------- */
    /* EVENTS */

    // Append event handlers for toolbar buttons and plot area clicks
    appendEventHandlers(svg, xScale, yScale, margin, plotAreaElem) {
        let self = this;
        let diagramElem = this.diagramElem;
        
        // Append click handler for measuring sticks
        let measuringStickPerpendicularElem = diagramElem.querySelector('.measuring-stick-toggle.perpendicular');
        if(measuringStickPerpendicularElem != null) {
            measuringStickPerpendicularElem.onclick = function() {
                self.toggleMeasuringStick('perpendicular', svg, xScale, yScale, margin, diagramElem, plotAreaElem);
            }
        }

        // Append click handler for measuring sticks
        let measuringStickHorizontalElem = diagramElem.querySelector('.measuring-stick-toggle.horizontal');
        if(measuringStickHorizontalElem != null) {
            measuringStickHorizontalElem.onclick = function() {
                self.toggleMeasuringStick('horizontal', svg, xScale, yScale, margin, diagramElem, plotAreaElem);
            }
        }

        // Append click handler for measuring sticks
        let measuringStickVerticalElem = diagramElem.querySelector('.measuring-stick-toggle.vertical');
        if(measuringStickVerticalElem != null) {
            measuringStickVerticalElem.onclick = function() {
                self.toggleMeasuringStick('vertical', svg, xScale, yScale, margin, diagramElem, plotAreaElem);
            }
        }

        // Append click handler for plot area clicks
        plotAreaElem.onclick = function(event) {
            // If there is an active measuring stick, remove it now
            if(self.measuringStick != null) {
                self.removeMeasuringStick(svg);
            }
            // Otherwise clear marking
            else {
                self.actions.clearAllMarking();
            }
        };
    } 

    // Toggle measuring stick 
    toggleMeasuringStick(mode, svg, xScale, yScale, margin, diagramElem, plotAreaElem) {
        let measuringStickElems = diagramElem.querySelectorAll('.measuring-stick-toggle'); 
        for(let thisElem of measuringStickElems) {
            thisElem.classList.remove('active');
        }

        let self = this;
        let measuringStickElem = diagramElem.querySelector('.measuring-stick-toggle.' + mode);
        if(this.measuringStick == null) {
            measuringStickElem.classList.add('active');
            this.measuringStick = {
                mode: mode,
                mouseMove: function(event) {
                    self.drawMeasuringStick(event, svg, xScale, yScale, margin);
                }
            }
            plotAreaElem.addEventListener('mousemove', this.measuringStick.mouseMove);
        }
        else if(this.measuringStick.mode != mode) {
            measuringStickElem.classList.add('active');
            this.measuringStick.mode = mode;
            this.measuringStick.created = null;
            svg.select('g.measuring-stick').remove(); 
        }
        else {
            this.removeMeasuringStick(svg);
        }

    }

    // Event handler for point selection
    pointClick(event, obj) {
        let configuration = this.configuration;

        // TODO MEASURING STICK
        if(this.measuringStick != null) {
            event.stopPropagation();
            this.measuringStick.start = obj;
        }
        else if(configuration.marking != null) {
            event.stopPropagation();
            if(event.ctrlKey == true)
                obj.row.mark("Toggle");
            else
                obj.row.mark("Replace");
        }
    }

    // Shows distances
    showDistances(distanceMode) {
        let diagramElem = this.diagramElem;

        let elems = diagramElem.querySelectorAll('g.delta-distance.visible');
        for(let thisNode of elems) {
            thisNode.classList.remove('visible');
        }

        if(distanceMode != null && distanceMode != 'none') {
            let distanceModes = distanceMode.replaceAll(' ', '').split('+');
            for(let thisDistanceMode of distanceModes) {
                let selectedElems = diagramElem.querySelectorAll('g.delta-distance.' + thisDistanceMode);
                for(let thisNode of selectedElems) {
                    thisNode.classList.add('visible');
                }
            }
        }
    }

    // Removes the measuring stick
    removeMeasuringStick(svg) {
        // Select the UI measuring stick and remove it
        svg.select('g.measuring-stick').remove();

        // Remove active class from the button
        let diagramElem = this.diagramElem;
        let measuringStickPerpendicularElem = diagramElem.querySelector('.measuring-stick-toggle.perpendicular');
        measuringStickPerpendicularElem.classList.remove('active');
        
        // Remove the event listener for mouse move
        let plotAreaElem = diagramElem.querySelector('.plot-area');
        plotAreaElem.removeEventListener('mousemove', this.measuringStick.mouseMove);

        // Remove the measuring stick config
        this.measuringStick = null;
    }

    // Rectangular selection
    rectangleSelection(selection) {
        // Get the SVG element
        let svg = this.diagramElem.querySelector('svg');
        let xScale = this.scales.xScale;
        let yScale = this.scales.yScale;

        // Define transformation functions
        // Convert screen coordinate to SVG coordinate, accounting for margins
        function screenToSvg(screenX, screenY) {
            let p = svg.createSVGPoint()
            p.x = screenX - WellSpacingDiagram.LEFT_MARGIN;
            p.y = screenY - WellSpacingDiagram.TOP_MARGIN;
            return p.matrixTransform(svg.getScreenCTM().inverse());
        }
        
        // Convert SVG coordinate to screen coordinate, accounting for margins
        function svgToScreen(svgX, svgY) {
            let p = svg.createSVGPoint()
            p.x = svgX + WellSpacingDiagram.LEFT_MARGIN;
            p.y = svgY + WellSpacingDiagram.TOP_MARGIN;
            return p.matrixTransform(svg.getScreenCTM());
        }        

        // Convert the selection rectangle coordinates
        let selectionBox = {
            x1: selection.rect.x,
            x2: selection.rect.x + selection.rect.width,
            y1: selection.rect.y,
            y2: selection.rect.y + selection.rect.height
        };

        // Determine if point is inside selection box
        function pointInSelectionBox(point) {
            return point.x >= selectionBox.x1 && point.x <= selectionBox.x2 && 
                point.y >= selectionBox.y1 && point.y <= selectionBox.y2;
        }

        // Initialize an array of selected objects
        let selectedArr = [];

        // Identify wells inside the rectangle
        d3.select(this.diagramElem)
            .select('svg')
            .selectAll('.well.selectable')
            .each(function(d) {
                // Get the circle element from the data point
                let circleElem = d3.select(this).node();

                // Coordinate transformation method
                // Convert the circle center from SVG coordinates to screen coordinates
                //let c = svgToScreen(circleElem.cx.baseVal.value, circleElem.cy.baseVal.value);
                let c = svgToScreen(xScale(d.x), yScale(d.y));

                // Get Bounding Cient Rect method
                // getBoundingClientRect gives a consistent bounding rectangle that 
                //   encapsulates the circle in the screen coordinates sysem. 
                //   The center point of the circle will be the center point of the 
                //   bounding client rect, so use upper-left x,y + 1/2 the relevant 
                //   dimension to get the center of the element.
                let point = {
                    x_rect: circleElem.getBoundingClientRect().x + circleElem.getBoundingClientRect().width / 2,
                    y_rect: circleElem.getBoundingClientRect().y + circleElem.getBoundingClientRect().height / 2,
                    x_ctm: c.x, // CTM method x for comparison
                    y_ctm: c.y  // CTM method y for comparison
                }

                point.x = point.x_ctm;
                point.y = point.y_ctm;

                // If the center of the element is within the selection box, then it's to be
                //   selected for marking
                if(pointInSelectionBox(point) == true) {
                    selectedArr.push(d.row);
                }
            });

        // Identify formations inside the rectangle
        d3.select(this.diagramElem)
            .select('svg')
            .selectAll('.formation.selectable')
            .each(function(d) {
                // Get the line element from the data point
                let lineElem = d3.select(this).node();

                // Coordinate transformation method
                // Convert the line start and end from SVG coordinates to screen coordinates
                let cStart = svgToScreen(xScale(d.start.x), yScale(d.start.y));
                let cEnd = svgToScreen(xScale(d.end.x), yScale(d.end.y));

                // If both points in selection box, then mark the start (which sets the color)
                if(pointInSelectionBox(cStart) == true && pointInSelectionBox(cEnd) == true) {
                    selectedArr.push(d.start.row);
                }
                // If one or the other is in selection box, then mark the one that's in the box
                else {
                    if(pointInSelectionBox(cStart) == true)
                        selectedArr.push(d.start.row);   
                    if(pointInSelectionBox(cEnd) == true)
                        selectedArr.push(d.end.row);   
                }
            });

        return selectedArr;
    }

    // Clear marking
    clearMarking() {
        let configuration = this.configuration;
        let wells = this.wells;
        let formations = this.formations;

        // If marking is enabled, unmark everything
        if(configuration.marking != null) {
            for(let thisWellGroup of wells) {
                for(let thisWell of thisWellGroup.data) {
                    thisWell.row.mark('Subtract');
                }
            }
            for(let thisFormationGroup of formations) {
                for(let thisFormation of thisFormationGroup.data) {
                    thisFormation.row.mark('Subtract');
                }
            }
        }
    }

    /* ---------------------------------------------------------------------------------------------------- */
    /* CALCULATIONS */

    // Calculate domains
    calculateDomains(groupMap, width, height) {
        // Build arrays
        let x_domain = [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER];
        let y_domain = [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER];

        // Create arrays to hold the individual groups by layer type
        let formations = [];
        let wells = [];

        // Sort groups into formations and wells
        for(let thisGroupName in groupMap) {
            let thisGroup = groupMap[thisGroupName];
            if(thisGroup.type == 'formation') {
                formations.push(thisGroup);                
            }
            else if(thisGroup.type == 'wells') {
                wells.push(thisGroup);
            }
        }

        // Calculate domains from wells
        // Set min and max for each of x and y axes
        for(let thisGroup of wells) {
            for(let thisData of thisGroup.data) {
                x_domain[0] = Math.min(x_domain[0], Math.floor(thisData.x));
                x_domain[1] = Math.max(x_domain[1], Math.ceil(thisData.x));
                y_domain[0] = Math.min(y_domain[0], Math.floor(thisData.y));
                y_domain[1] = Math.max(y_domain[1], Math.ceil(thisData.y));
            }                
        }

        // Applies a padding to x and y axes for wells
        // This will add/subtract 1/2 a standard tick interval to the upper and lower bound
        //   of each domain range
        // Wells use points with radius, this should allow the circles to remain
        //   within the plot area (hopefully)

        // Define x-axis
        let x = d3.scaleLinear()
            .domain(x_domain)
            .range([0, width]);
       
        let x_delta = (x.ticks()[0] - x.ticks()[1]) / 2;
        x_domain[0] = x_domain[0] + x_delta;
        x_domain[1] = x_domain[1] + -1 * x_delta;

        // Define y-axis
        let y = d3.scaleLinear()
            .domain(y_domain)
            .range([height, 0]);

        let y_delta = (y.ticks()[0] - y.ticks()[1]) / 2;
        y_domain[0] = y_domain[0] + y_delta;
        y_domain[1] = y_domain[1] + -1 * y_delta;

        // Calculate domains from formations
        // Adjust min and max based on the formation extents
        // Formations use lines, so these will go to the full extents without any padding (hopefully)
        for(let thisGroup of formations) {
            for(let thisData of thisGroup.data) {
                thisGroup.color = thisData.color;

                x_domain[0] = Math.min(x_domain[0], Math.floor(thisData.x));
                x_domain[1] = Math.max(x_domain[1], Math.ceil(thisData.x));
                y_domain[0] = Math.min(y_domain[0], Math.floor(thisData.y));
                y_domain[1] = Math.max(y_domain[1], Math.ceil(thisData.y));
            }
        }

        // Return domains and sorted data
        return {
            x_domain: x_domain,
            y_domain: y_domain,
            formations: formations,
            wells: wells
        }
    }

    // Calculate well perpendicular deltas
    calculateDeltas(wells) {
        for(let thisWellGroup of wells) {
            let computed = this.calculateWellDeltas(thisWellGroup.data);
            thisWellGroup.computed = computed;
        }
    }

    // Calculate well deltas for a well array
    calculateWellDeltas(data) {
        // Sort data by x
        let sorted = [...data].sort(function(a, b){ return a.x - b.x });
        let computed = [];

        for(let currentIdx = 0; currentIdx < sorted.length - 1; currentIdx++) {
            let thisData = sorted[currentIdx];
            if(this.distancesLimitToMarked == true && thisData.row.isMarked() == false) continue;

            let distances = [];
            for(let nextIdx = currentIdx + 1; nextIdx < sorted.length; nextIdx++) {
                let nextData = sorted[nextIdx];
                if(this.distancesLimitToMarked == true && nextData.row.isMarked() == false) continue;
    
                let dx = nextData.x - thisData.x;
                let dy = nextData.y - thisData.y;
                let dh = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
                let distance = {
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

            distances.sort(function(a, b) { return a.dh - b.dh });
            let sliced = distances.slice(0, WellSpacingDiagram.NEIGHBOR_LIMIT);
            for(let slicedIdx = 0; slicedIdx < sliced.length; slicedIdx++) {
                sliced[slicedIdx].location = slicedIdx % WellSpacingDiagram.NEIGHBOR_LIMIT;
            }

            for(let thisSlice of sliced) {
                computed.push(thisSlice);
            }
        }

        return computed;
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
        let dx = xScale(x2) - xScale(x1);
        let dy = yScale(y2) - yScale(y1);

        let angleRads = Math.atan(dy / dx);
        let angleDeg = angleRads * 180 / Math.PI;

        let transX = 0;
        let transY = 3;

        let labelX = PerpendicularDistance.getLabelPositionX(xScale, x1, x2);
        let labelY = PerpendicularDistance.getLabelPositionY(yScale, y1, y2);
        
        let s = 'rotate(' + angleDeg + ',' + labelX + ',' + labelY + ') translate(' + transX + ',' + transY + ')'; 
        return s;
    }
}

/*
 * Copyright © 2024. Cloud Software Group, Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

class ZoomHandler {
    static KNOB_SIZE = 14;
    static ZOOM_X_POSITION = 'lower'; // upper | lower
    
    // Event types
    static ZOOM_CHANGE_EVENT = 'zoomchange';
    static ZOOM_X_CHANGE_EVENT = 'zoomxchange';
    static ZOOM_Y_CHANGE_EVENT = 'zoomychange';

    #zoomXElem;
    #zoomYElem;
    #zoomXSlider;
    #zoomYSlider;

    constructor(contentElem, vizElem) {
        // Create container
        const zoomContainerElem = document.createElement('div');
        zoomContainerElem.classList.add('zoom-container');
        zoomContainerElem.classList.add('content-inner');
        contentElem.appendChild(zoomContainerElem);
        
        // Creat zoom-x element and append to container
        if(ZoomHandler.ZOOM_X_POSITION == 'upper') {
            const zoomXElem = document.createElement('div');
            zoomXElem.classList.add('zoom');
            zoomXElem.classList.add('zoom-x');
            zoomContainerElem.appendChild(zoomXElem);
            this.#zoomXElem = zoomXElem;
        }

        // Create row
        const zoomRowElem = document.createElement('div');
        zoomRowElem.classList.add('zoom-row');
        zoomContainerElem.appendChild(zoomRowElem);

        // Creat zoom-x element and append to container
        if(ZoomHandler.ZOOM_X_POSITION == 'lower') {
            const zoomXElem = document.createElement('div');
            zoomXElem.classList.add('zoom');
            zoomXElem.classList.add('zoom-x');
            zoomContainerElem.appendChild(zoomXElem);
            this.#zoomXElem = zoomXElem;
        }

        // Create zoom-y element and append to row
        const zoomYElem = document.createElement('div');
        zoomYElem.classList.add('zoom');
        zoomYElem.classList.add('zoom-y');
        zoomRowElem.appendChild(zoomYElem);
        this.#zoomYElem = zoomYElem;

        // Create zoom-content element and append to row
        const zoomContentElem = document.createElement('div');
        zoomContentElem.classList.add('zoom-content');
        zoomRowElem.appendChild(zoomContentElem);

        // Append vizElem to zoom content elem
        zoomContentElem.appendChild(vizElem);

        // Create sliders
        const zoomXElem = this.#zoomXElem;
        this.#zoomYSlider = new ZoomYSlider(zoomYElem);
        this.#zoomXSlider = new ZoomXSlider(zoomXElem);
    }

    showZoom(enabledX, enabledY) {
        this.showZoomX(enabledX);
        this.showZoomY(enabledY);
    }

    showZoomX(enabled) {
        if(enabled == true)
            this.#zoomXElem.classList.add('visible');
        else
            this.#zoomXElem.classList.remove('visible');
        this.#zoomXSlider.show(enabled);
    }

    showZoomY(enabled) {
        if(enabled == true)
            this.#zoomYElem.classList.add('visible');
        else
            this.#zoomYElem.classList.remove('visible');
        this.#zoomYSlider.show(enabled);
    }

    // Register event listener
    addEventListener(eventName, callback) {
        this.#zoomXSlider.addEventListener(eventName, callback);
        this.#zoomYSlider.addEventListener(eventName, callback);
    }

    // Set initial zoom range from string
    setZoomRangeStr(zoomConfigStr) {
        const range = JSON.parse(zoomConfigStr);
        this.#zoomXSlider.setZoomRange(range.x.rangeFrom, range.x.rangeTo);
        this.#zoomYSlider.setZoomRange(range.y.rangeFrom, range.y.rangeTo);
    }

    // Get the zoom range
    getZoomRange() {
        const x = this.#zoomXSlider.getZoomRange();
        const y = this.#zoomYSlider.getZoomRange();
        return {x: x, y: y};
    }
}

class ZoomYSlider {
    static DEFAULT_SLIDER_UPPER = 0.0;
    static DEFAULT_SLIDER_LOWER = 1.0;

    static Y_SLIDER_OFFSET = 20;

    #eventListeners = {};
    #sliderUpper = ZoomYSlider.DEFAULT_SLIDER_UPPER;
    #sliderLower = ZoomYSlider.DEFAULT_SLIDER_LOWER;

    #zoomYElem;
    #sliderSelectedElem;
    #sliderKnobLowerElem;
    #sliderKnobUpperElem;

    constructor(zoomYElem) {
        this.#zoomYElem = zoomYElem;

        // Draw components
        this.draw();

        // Debounce
        let timeoutId = null; // let because it will be re-assigned
        this.debounce = (callback, wait) => {
            return (...args) => {
                window.clearTimeout(timeoutId);
              timeoutId = window.setTimeout(() => {
                callback(...args);
              }, wait);
            };
          }
    }

    draw() {
        const zoomYElem = this.#zoomYElem;

        const sliderBackElem = this.drawZoomSliderBackground(zoomYElem);
        const sliderSelectedElem = this.drawZoomSliderSelected(zoomYElem);
        const sliderKnobLowerElem = this.drawZoomSliderKnob(zoomYElem, 'lower');
        const sliderKnobUpperElem = this.drawZoomSliderKnob(zoomYElem, 'upper');

        this.#sliderSelectedElem = sliderSelectedElem;
        this.#sliderKnobLowerElem = sliderKnobLowerElem;
        this.#sliderKnobUpperElem = sliderKnobUpperElem;

        // Position
        this.position();

        // Append event handlers
        this.appendLowerEventHandler(sliderKnobLowerElem, sliderSelectedElem, sliderBackElem);
        this.appendUpperEventHandler(sliderKnobUpperElem, sliderSelectedElem, sliderBackElem);
        this.appendSelectedEventHandler(sliderKnobLowerElem, sliderKnobUpperElem, sliderSelectedElem, sliderBackElem);
    }
    
    // Draw slider background
    drawZoomSliderBackground(zoomContainerElem) {
        // Zoom slider background element
        const sliderBackElem = document.createElement('div');
        sliderBackElem.classList.add('slider-background');
        zoomContainerElem.appendChild(sliderBackElem);

        return sliderBackElem;
    }

    // Draw slider selected
    drawZoomSliderSelected(zoomContainerElem) {
        // Zoom slider selected element
        const sliderSelectedElem = document.createElement('div');
        sliderSelectedElem.classList.add('slider-selected');
        zoomContainerElem.appendChild(sliderSelectedElem);

        return sliderSelectedElem;
    }

    // Draw slider knob at position
    drawZoomSliderKnob(zoomContainerElem, position) {
        const sliderKnob = document.createElement('div');
        sliderKnob.classList.add('slider-knob');
        sliderKnob.classList.add(position);
        zoomContainerElem.appendChild(sliderKnob);

        return sliderKnob;
    }

    // Get position for lower knob
    getLowerPosition() {
        return 'calc(' + (this.#sliderLower * 100) + '% - ' + (0) + 'px)';
    }

    // Get position for upper knob
    getUpperPosition() {
        return (this.#sliderUpper * 100) + '%';
    }

    // Get slider selected height
    getSelectedHeight() {
        return ((this.#sliderLower - this.#sliderUpper) * 100) + '%';
    }

    // Position lower
    positionLower() {
        this.#sliderKnobLowerElem.style.top = this.getLowerPosition();
    }

    // Position upper
    positionUpper() {
        this.#sliderKnobUpperElem.style.top = this.getUpperPosition();
    }

    // Position selected
    positionSelected() {
        this.#sliderSelectedElem.style.top = this.getUpperPosition();
        this.#sliderSelectedElem.style.height = this.getSelectedHeight();
    }

    // Positions all
    position() {
        this.positionLower();
        this.positionUpper();
        this.positionSelected();
    }

    // Append lower event handler
    appendLowerEventHandler(sliderKnobElem, sliderSelectedElem, sliderBackElem) {
        const self = this;

        sliderKnobElem.addEventListener('mousedown', function(e) {
            e.stopPropagation();

            // Calculate start
            const startClientY = e.clientY;
            const startPositionY = sliderKnobElem.getBoundingClientRect().top;
            const sliderHeight = sliderBackElem.getBoundingClientRect().height;

            const mousemove = function(e) {
                e.stopPropagation();

                // Calculate new position
                const deltaY = e.clientY - startClientY - ZoomYSlider.Y_SLIDER_OFFSET;
                const newPositionY = startPositionY + deltaY;
                self.#sliderLower = newPositionY / sliderHeight;

                // Check bounds
                if(self.#sliderLower > 1.0)
                    self.#sliderLower = 1.0;
                if(self.#sliderLower < self.#sliderUpper + (ZoomHandler.KNOB_SIZE / sliderHeight))
                    self.#sliderLower = self.#sliderUpper + (ZoomHandler.KNOB_SIZE / sliderHeight);
                
                // Position slider knob and selected
                self.positionLower();
                self.positionSelected();

                // Notify all listeners
                self.notifyAllListeners();
            }

            const mouseup = function(e) {
                e.stopPropagation();
                document.removeEventListener('mousemove', mousemove);
                document.removeEventListener('mouseup', mouseup);
            }

            document.addEventListener('mousemove', mousemove);
            document.addEventListener('mouseup', mouseup);
        });
    }

    // Append upper event handler
    appendUpperEventHandler(sliderKnobElem, sliderSelectedElem, sliderBackElem)  {
        const self = this;

        sliderKnobElem.addEventListener('mousedown', function(e) {
            e.stopPropagation();

            // Calculate start
            const startClientY = e.clientY;
            const startPositionY = sliderKnobElem.getBoundingClientRect().top;
            const sliderHeight = sliderBackElem.getBoundingClientRect().height;

            const mousemove = function(e) {
                e.stopPropagation();

                // Calcuate new position
                const deltaY = e.clientY - startClientY - ZoomYSlider.Y_SLIDER_OFFSET;
                const newPositionY = startPositionY + deltaY;
                self.#sliderUpper = newPositionY / sliderHeight;

                // Check bounds
                if(self.#sliderUpper < 0.0)
                    self.#sliderUpper = 0.0;
                if(self.#sliderUpper > self.#sliderLower - (ZoomHandler.KNOB_SIZE / sliderHeight))
                    self.#sliderUpper = self.#sliderLower - (ZoomHandler.KNOB_SIZE / sliderHeight);
                
                // Position slider knob and selected
                self.positionUpper();
                self.positionSelected();

                // Notify all listeners
                self.notifyAllListeners();
            }

            const mouseup = function(e) {
                e.stopPropagation();
                document.removeEventListener('mousemove', mousemove);
                document.removeEventListener('mouseup', mouseup);
            }

            document.addEventListener('mousemove', mousemove);
            document.addEventListener('mouseup', mouseup);
        });
    }

    // Append selected event handler
    appendSelectedEventHandler(sliderKnobLowerElem, sliderKnobUpperElem, sliderSelectedElem, sliderBackElem) {
        const self = this;
        
        sliderSelectedElem.addEventListener('mousedown', function(e) {
            e.stopPropagation();

            // Calculate start
            const startClientY = e.clientY;
            const startPositionLowerY = sliderKnobLowerElem.getBoundingClientRect().top;
            const startPositionUpperY = sliderKnobUpperElem.getBoundingClientRect().top;
            const sliderHeight = sliderBackElem.getBoundingClientRect().height;
            
            const mousemove = function(e) {
                e.stopPropagation();

                // Calcuate new position
                const deltaY = e.clientY - startClientY - ZoomYSlider.Y_SLIDER_OFFSET;

                const newPositionLowerY = startPositionLowerY + deltaY;
                let sliderLower = newPositionLowerY / sliderHeight;
                const newPositionUpperY = startPositionUpperY + deltaY;
                let sliderUpper = newPositionUpperY / sliderHeight;
                
                // Check bounds
                if(sliderLower > 1.0) {
                    sliderLower = 1.0;
                    sliderUpper = self.#sliderUpper;
                }
                else if(sliderUpper < 0.0) {
                    sliderLower = self.#sliderLower;
                    sliderUpper = 0.0;
                }
                
                // Set positions
                self.#sliderLower = sliderLower;
                self.#sliderUpper = sliderUpper;

                // Position slider knobs and selected
                self.position();

                // Notify all listeners
                self.notifyAllListeners();
            }

            const mouseup = function(e) {
                e.stopPropagation();
                document.removeEventListener('mousemove', mousemove);
                document.removeEventListener('mouseup', mouseup);
            }

            document.addEventListener('mousemove', mousemove);
            document.addEventListener('mouseup', mouseup);
        });
    }

    // Show or hide
    show(enabled) {
        if(enabled == true)
            this.notifyAllListeners();
        else {
            this.#sliderUpper = ZoomYSlider.DEFAULT_SLIDER_UPPER;
            this.#sliderLower = ZoomYSlider.DEFAULT_SLIDER_LOWER;

            // Position
            this.position();

            this.notifyAllListeners();
        }
    }

    // Register event listener
    addEventListener(eventName, callback) {
        const eventNames = [ZoomHandler.ZOOM_CHANGE_EVENT, ZoomHandler.ZOOM_Y_CHANGE_EVENT];
        if(eventNames.includes(eventName) == false) return;

        let eventListenerList = this.#eventListeners[eventName];
        if(eventListenerList == null) {
            eventListenerList = [];
            this.#eventListeners[eventName] = eventListenerList;
        }

        eventListenerList.push(callback);
    }

    // Notify listeners
    notifyListeners(eventName) {
        const self = this;

        function notify(){
            const e = {
                name: eventName,
                y: self.getZoomRange()
            }

            const eventListenerList = self.#eventListeners[eventName];
            for(let thisEventListener of eventListenerList) {
                thisEventListener(e);
            }
        }
          
        const process = this.debounce(notify);
        process();
    }

    // Notifies all listeners
    notifyAllListeners() {
        for(let thisEventName in this.#eventListeners) {
            this.notifyListeners(thisEventName);
        }
    }

    // Set the zoom range
    setZoomRange(rangeFrom, rangeTo) {
        this.#sliderUpper = rangeFrom;
        this.#sliderLower = rangeTo;
        this.position();
        this.notifyAllListeners();
    }

    // Get the zoom range
    getZoomRange() {
        const range = {
            rangeFrom: this.#sliderUpper,
            rangeTo: this.#sliderLower        
        }

        return range;
    }
}

class ZoomXSlider {
    static DEFAULT_SLIDER_UPPER = 1.0;
    static DEFAULT_SLIDER_LOWER = 0.0;

    #eventListeners = {};
    #sliderUpper = ZoomXSlider.DEFAULT_SLIDER_UPPER;
    #sliderLower = ZoomXSlider.DEFAULT_SLIDER_LOWER;

    #zoomXElem;
    #sliderSelectedElem;
    #sliderKnobLowerElem;
    #sliderKnobUpperElem;

    constructor(zoomXElem) {
        this.#zoomXElem = zoomXElem;

        // Draw components
        this.draw();

        // Create debounce function
        let timeoutId = null;
        this.debounce = (callback, wait) => {
            return (...args) => {
                window.clearTimeout(timeoutId);
              timeoutId = window.setTimeout(() => {
                callback(...args);
              }, wait);
            };
          }
    }

    draw() {
        const zoomXElem = this.#zoomXElem;

        const sliderBackElem = this.drawZoomSliderBackground(zoomXElem);
        const sliderSelectedElem = this.drawZoomSliderSelected(zoomXElem);
        const sliderKnobLowerElem = this.drawZoomSliderKnob(zoomXElem, 'lower');
        const sliderKnobUpperElem = this.drawZoomSliderKnob(zoomXElem, 'upper');

        this.#sliderSelectedElem = sliderSelectedElem;
        this.#sliderKnobLowerElem = sliderKnobLowerElem;
        this.#sliderKnobUpperElem = sliderKnobUpperElem;

        // Position
        this.position();

        // Append event handlers
        this.appendLowerEventHandler(sliderKnobLowerElem, sliderSelectedElem, sliderBackElem);
        this.appendUpperEventHandler(sliderKnobUpperElem, sliderSelectedElem, sliderBackElem);
        this.appendSelectedEventHandler(sliderKnobLowerElem, sliderKnobUpperElem, sliderSelectedElem, sliderBackElem);
    }

    // Draw slider backgroun
    drawZoomSliderBackground(zoomContainerElem) {
        // Zoom slider background element
        const sliderBackElem = document.createElement('div');
        sliderBackElem.classList.add('slider-background');
        zoomContainerElem.appendChild(sliderBackElem);

        return sliderBackElem;
    }

    // Draw slider selected
    drawZoomSliderSelected(zoomContainerElem) {
        // Zoom slider selected element
        const sliderSelectedElem = document.createElement('div');
        sliderSelectedElem.classList.add('slider-selected');
        zoomContainerElem.appendChild(sliderSelectedElem);

        return sliderSelectedElem;
    }

    // Draw slider knob
    drawZoomSliderKnob(zoomContainerElem, position) {
        const sliderKnob = document.createElement('div');
        sliderKnob.classList.add('slider-knob');
        sliderKnob.classList.add(position);
        zoomContainerElem.appendChild(sliderKnob);

        return sliderKnob;
    }

    // Get position for lower knob
    getLowerPosition() {
        return (this.#sliderLower * 100) + '%';
    }

    // Get position for upper knob
    getUpperPosition() {
        return 'calc(' + (this.#sliderUpper * 100) + '% - ' + (0) + 'px)';
    }

    // Get slider selected width
    getSelectedWidth() {
        return ((this.#sliderUpper - this.#sliderLower) * 100) + '%';
    }

    // Position lower
    positionLower() {
        this.#sliderKnobLowerElem.style.left = this.getLowerPosition();
    }

    // Position upper
    positionUpper() {
        this.#sliderKnobUpperElem.style.left = this.getUpperPosition();
    }

    // Position selected
    positionSelected() {
        this.#sliderSelectedElem.style.left = this.getLowerPosition();
        this.#sliderSelectedElem.style.width = this.getSelectedWidth();
    }

    // Positions all
    position() {
        this.positionLower();
        this.positionUpper();
        this.positionSelected();
    }

    // Append lower knob event handler
    appendLowerEventHandler(sliderKnobElem, sliderSelectedElem, sliderBackElem) {
        const self = this;

        sliderKnobElem.addEventListener('mousedown', function(e) {
            e.stopPropagation();

            // Calculate start
            const startClientX = e.clientX;
            const startPositionX = sliderKnobElem.getBoundingClientRect().left;
            const sliderWidth = sliderBackElem.getBoundingClientRect().width;

            const mousemove = function(e) {
                e.stopPropagation();

                // Calculate new position
                const deltaX = e.clientX - startClientX;
                const newPositionX = startPositionX + deltaX - ZoomHandler.KNOB_SIZE * 1.5;
                self.#sliderLower = newPositionX / sliderWidth;

                // Check bounds
                if(self.#sliderLower < 0.0)
                    self.#sliderLower = 0.0;
                if(self.#sliderLower > self.#sliderUpper - (ZoomHandler.KNOB_SIZE / sliderWidth))
                    self.#sliderLower = self.#sliderUpper - (ZoomHandler.KNOB_SIZE / sliderWidth);
                
                // Position slider knob and selected
                self.positionLower();
                self.positionSelected();

                // Notify all listeners
                self.notifyAllListeners();
            }

            const mouseup = function(e) {
                e.stopPropagation();
                document.removeEventListener('mousemove', mousemove);
                document.removeEventListener('mouseup', mouseup);
            }

            document.addEventListener('mousemove', mousemove);
            document.addEventListener('mouseup', mouseup);
        });
    }

    // Append upper knob event handler
    appendUpperEventHandler(sliderKnobElem, sliderSelectedElem, sliderBackElem) {
        const self = this;

        sliderKnobElem.addEventListener('mousedown', function(e) {
            e.stopPropagation();

            // Calculate start
            const startClientX = e.clientX;
            const startPositionX = sliderKnobElem.getBoundingClientRect().left;
            const sliderWidth = sliderBackElem.getBoundingClientRect().width;

            const mousemove = function(e) {
                e.stopPropagation();

                // Calculate new position
                const deltaX = e.clientX - startClientX;
                const newPositionX = startPositionX + deltaX - ZoomHandler.KNOB_SIZE * 1.5;
                self.#sliderUpper = newPositionX / sliderWidth;

                // Check bounds
                if(self.#sliderUpper > 1.0)
                    self.#sliderUpper = 1.0;
                if(self.#sliderUpper < self.#sliderLower + (ZoomHandler.KNOB_SIZE / sliderWidth))
                    self.#sliderUpper = self.#sliderLower + (ZoomHandler.KNOB_SIZE / sliderWidth);
                
                // Position slider knob and selected
                self.positionUpper();
                self.positionSelected();

                // Notify all listeners
                self.notifyAllListeners();
            }

            const mouseup = function(e) {
                e.stopPropagation();

                document.removeEventListener('mousemove', mousemove);
                document.removeEventListener('mouseup', mouseup);
            }

            document.addEventListener('mousemove', mousemove);
            document.addEventListener('mouseup', mouseup);
        });
    }

    // Append selected event handler
    appendSelectedEventHandler(sliderKnobLowerElem, sliderKnobUpperElem, sliderSelectedElem, sliderBackElem) {
        const self = this;
        
        sliderSelectedElem.addEventListener('mousedown', function(e) {
            e.stopPropagation();

            // Calculate start
            const startClientX = e.clientX;
            const startPositionLowerX = sliderKnobLowerElem.getBoundingClientRect().left;
            const startPositionUpperX = sliderKnobUpperElem.getBoundingClientRect().left;
            const sliderWidth = sliderBackElem.getBoundingClientRect().width;
            
            const mousemove = function(e) {
                e.stopPropagation();

                // Calcuate new position
                const deltaX = e.clientX - startClientX;

                const newPositionLowerX = startPositionLowerX + deltaX;
                let sliderLower = newPositionLowerX / sliderWidth;
                const newPositionUpperX = startPositionUpperX + deltaX;
                let sliderUpper = newPositionUpperX / sliderWidth;
                
                // Check bounds
                if(sliderLower < 0.0) {
                    sliderLower = 0.0;
                    sliderUpper = self.#sliderUpper;
                }
                else if(sliderUpper > 1.0) {
                    sliderLower = self.#sliderLower;
                    sliderUpper = 1.0;
                }
                
                // Set positions
                self.#sliderLower = sliderLower;
                self.#sliderUpper = sliderUpper;

                // Position slider knobs and selected
                self.position();

                // Notify all listeners
                self.notifyAllListeners();
            }

            const mouseup = function(e) {
                e.stopPropagation();
                document.removeEventListener('mousemove', mousemove);
                document.removeEventListener('mouseup', mouseup);
            }

            document.addEventListener('mousemove', mousemove);
            document.addEventListener('mouseup', mouseup);
        });
    }

    // Show or hide
    show(enabled) {
        if(enabled == true)
            this.notifyAllListeners();
        else {
            this.#sliderUpper = ZoomXSlider.DEFAULT_SLIDER_UPPER;
            this.#sliderLower = ZoomXSlider.DEFAULT_SLIDER_LOWER;

            // Position
            this.position();

            this.notifyAllListeners();
        }
    }

    // Register event listener
    addEventListener(eventName, callback) {
        const eventNames = [ZoomHandler.ZOOM_CHANGE_EVENT, ZoomHandler.ZOOM_X_CHANGE_EVENT];
        if(eventNames.includes(eventName) == false) return;

        let eventListenerList = this.#eventListeners[eventName];
        if(eventListenerList == null) {
            eventListenerList = [];
            this.#eventListeners[eventName] = eventListenerList;
        }

        eventListenerList.push(callback);
    }

    // Notify listeners
    notifyListeners(eventName) {
        const self = this;

        function notify(){
            const e = {
                name: eventName,
                x: self.getZoomRange()
            }

            const eventListenerList = self.#eventListeners[eventName];
            for(let thisEventListener of eventListenerList) {
                thisEventListener(e);
            }
        }
          
        const process = this.debounce(notify);
        process();
    }

    // Notifies all listeners
    notifyAllListeners() {
        for(let thisEventName in this.#eventListeners) {
            this.notifyListeners(thisEventName);
        }
    }

    // Set the zoom range
    setZoomRange(rangeFrom, rangeTo) {
        this.#sliderLower = rangeFrom;
        this.#sliderUpper = rangeTo;
        this.position();
        this.notifyAllListeners();
    }

    // Get the zoom range
    getZoomRange() {
        const range = {
            rangeFrom: this.#sliderLower,
            rangeTo: this.#sliderUpper        
        }

        return range;
    }
}
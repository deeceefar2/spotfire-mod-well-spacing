/*
 * Copyright © 2024. Cloud Software Group, Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

class TrellisCollection {
    // Declare static constants
    static #directions = ['columns', 'rows'];

    // Declare properties set in constructor
    #trellisCollectionElem;
    #trellisPanelArr = [];

    // Creates a new trellis collection and appends elements to the specified vizElem
    constructor(vizElem) {
        const trellisCollectionElem = document.createElement('div');
        trellisCollectionElem.classList.add('trellis-collection');
        vizElem.appendChild(trellisCollectionElem);

        this.#trellisCollectionElem = trellisCollectionElem;
    }

    // Draws the specified number of panels
    draw(panelCount) {
        const currentPanelCount = this.#trellisPanelArr.length;

        // If panel count matches, then it's good so just return
        if(panelCount == currentPanelCount) return;

        // Calculate the current panel count compared to the target
        const delta = panelCount - currentPanelCount;

        // If more panels required, make and append
        if(delta > 0) {
            for(let idx = 0; idx < delta; idx++) {
                const thisTrellisPanel = new TrellisPanel();
                this.#trellisPanelArr.push(thisTrellisPanel);
                this.#trellisCollectionElem.appendChild(thisTrellisPanel.getTrellisPanelElem());
            }
        }
        // If less panels required, remove and delete (will be gc)
        else if(delta < 0) {
            for(let idx = 0; idx < Math.abs(delta); idx++) {
                const thisTrellisPanel = this.#trellisPanelArr.pop();
                this.#trellisCollectionElem.removeChild(thisTrellisPanel.getTrellisPanelElem());
            }
        }
    }

    // Sets the trellised flag as a class on the collection
    // This is so the panels will not look like they are trellised (even though they are)
    setTrellised(trellised) {
        const className = 'trellised';
        if(trellised == true)
            this.#trellisCollectionElem.classList.add(className);
        else
            this.#trellisCollectionElem.classList.remove(className);
    }

    // Sets the orientation of the trellis panels
    setDirection(trellisDirection) {
        this.#trellisCollectionElem.classList.remove(...TrellisCollection.#directions);
        this.#trellisCollectionElem.classList.add(trellisDirection);
    }

    // Returns the panel at the specified index
    getPanel(index) {
        return this.#trellisPanelArr[index];
    }

    // Get all panels
    getPanels() {
        return this.#trellisPanelArr;
    }
}

class TrellisPanel {
    // Declare properties set in constructor
    #trellisPanelElem;
    #trellisPanelTitleElem;
    #canvasElem;
    
    // Declare properties set through accessors
    #diagram;

    // Creates a new trellis panel and initializes elements, but doesn't append here
    constructor() {
        const trellisPanelElem = document.createElement('div');
        trellisPanelElem.classList.add('trellis-panel');

        const trellisPanelTitleElem = document.createElement('div');
        trellisPanelTitleElem.classList.add('title');
        trellisPanelElem.appendChild(trellisPanelTitleElem);

        const canvasElem = document.createElement('div');
        canvasElem.classList.add('canvas');
        trellisPanelElem.appendChild(canvasElem);

        this.#trellisPanelElem = trellisPanelElem;
        this.#trellisPanelTitleElem = trellisPanelTitleElem;
        this.#canvasElem = canvasElem;
    }

    // Sets the title for the panel
    // For the case where it's a hidden trellis when non-trellised, this will
    // be set as a null and won't display the title
    setTitle(title) {
        this.#trellisPanelTitleElem.innerHTML = title;
    }

    // Returns the trellis panel element
    getTrellisPanelElem() {
        return this.#trellisPanelElem;
    }

    // Return the canvas elem
    getCanvasElem() {
        return this.#canvasElem;
    }

    // Set the diagram
    setDiagram(diagram) {
        this.#diagram = diagram;
    }

    // Return the diagram
    getDiagram() {
        return this.#diagram;
    }
}

class TrellisItemMap {
    #trellisMap = {};

    constructor() {

    }

    // Returns the trellis item for the specified name
    // The trellis will be created if not found
    getTrellis(trellisName) {
        let thisTrellisItem = this.#trellisMap[trellisName]; // let because it might be reassigned
        if(thisTrellisItem == null) {
            thisTrellisItem = new TrellisItem(trellisName);
            this.#trellisMap[trellisName] = thisTrellisItem;
        }

        return thisTrellisItem;
    }

    // Adds an object to the specified trellis name and group name
    addObjectToTrellisAndGroup(trellisName, groupName, groupType, data, indexProp) {
        const thisTrellisItem = this.getTrellis(trellisName);
        const thisGroupItem = thisTrellisItem.getGroup(groupName, groupType);
        thisGroupItem.addData(data, indexProp);
    }

    // Returns the count of trellis items
    getCount() {
        return Object.keys(this.#trellisMap).length
    }

    // Iterates over all items in the collection and invokes the callback function
    iterateTrellisItems(callback) {
        const trellisItemIndices = Object.keys(this.#trellisMap).sort();
        for(let trellisItemIdx = 0; trellisItemIdx < trellisItemIndices.length; trellisItemIdx++) {
            const thisTrellisItemName = trellisItemIndices[trellisItemIdx];
            const thisTrellisItem = this.#trellisMap[thisTrellisItemName];
            callback(thisTrellisItem, trellisItemIdx);
        }
    }
}

class TrellisItem {
    #name;
    #groupMap = {};

    constructor(trellisName) {
        this.#name = trellisName;
    }

    getName() {
        return this.#name;
    }

    getGroupMap() {
        return this.#groupMap;
    }

    getGroup(groupName, groupType) {
        let thisGroupItem = this.#groupMap[groupName]; // let because it might be re-assigned
        if(thisGroupItem == null) {
            thisGroupItem = new GroupItem(groupName, groupType);
            this.#groupMap[groupName] = thisGroupItem;
        }

        return thisGroupItem;
    }
}

class GroupItem {
    #name;
    #type;
    #markedColor;
    #markedCount = 0;
    #data = [];
    #dataMap = {};
    #markedData = [];

    constructor(groupName, type) {
        this.#name = groupName;
        this.#type = type;
    }

    // Returns the name
    getName() {
        return this.#name;
    }

    // Returns the type
    getType() {
        return this.#type;
    }

    // Adds the data
    addData(data, indexProp) {
        if(data.row.isMarked() == true) {
            this.#markedColor = data.row.color().hexCode;
            this.#markedCount++;
            this.#markedData.push(data);
        } 
        this.#data.push(data);

        if(indexProp != null) {
            const val = data[indexProp];
            this.#dataMap[val] = data;
        }
    }

    // Returns the data
    getData() {
        return this.#data;
    }

    // Returns the data map
    getDataMap() {
        return this.#dataMap;
    }

    // Returns the marked data as segments
    getMarkedDataSegments() {
        const segments = [];
        
        const indices = [];
        for(let thisMarkedData of this.#markedData) {
            indices.push(this.#data.indexOf(thisMarkedData));
        }

        if(indices.length > 0) {                
            let segment = [this.#data[indices[0]]];
            let lastIndex = indices[0];
            segments.push(segment);

            for(let idx = 1; idx < indices.length; idx++) {
                let thisIndex = indices[idx];
                if(thisIndex == lastIndex + 1) {
                    segment.push(this.#data[thisIndex]);
                    lastIndex = thisIndex;
                }
                else {
                    segment = [this.#data[thisIndex]];
                    lastIndex = thisIndex;
                    segments.push(segment);
                }
            }
        }

        return segments;
    }

    // Returns the color for the group
    getColor() {
        if(this.#data.length == 0)
            return null;
        if(this.#markedCount == 0) {
            return this.#data[0].color;
        }
        else {
            return this.#markedColor;
        }
    }

    // Returns the closest data from the data map
    getClosestData(val, indexProp) {
        let lower = null;
        let upper = null;

        for(let thisData of this.#data) {
            let thisVal = thisData[indexProp];
            if(thisVal <= val) {
                lower = Math.max(thisVal, lower);
            }
            else {
                upper = upper == null ? thisVal : Math.min(thisVal, upper);
            }
        }

        const deltaUpper = Math.abs(lower - val);
        const deltaLower = Math.abs(upper - val);

        if(deltaUpper <= deltaLower)
            return this.#dataMap[upper];
        else
            return this.#dataMap[lower];
    }
}
/*
 * Copyright © 2024. Cloud Software Group, Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

class RectMarking {
    static MIN_SELECTION_SIZE = 2;

    constructor(vizElem) {
        this.enabled = null;
        this.selectionDiv = document.createElement("div");
        this.selectionDiv.className = "selection";

        this.selectionBgDiv = document.createElement("div");
        this.selectionBgDiv.className = "selection-bg";

        //document.querySelector("body").appendChild(this.selectionBgDiv);
        //document.querySelector("body").appendChild(this.selectionDiv);
        vizElem.appendChild(this.selectionBgDiv);
        vizElem.appendChild(this.selectionDiv);
        
        this.selectionPoint = { x: 0, y: 0 };
        this.meta = { ctrlKey: false, altKey: false };
    }

    clamp = (value, min, max) => Math.min(Math.max(min, value), max);

    addHandlersSelection = (callback) => {
        document.onmousedown = (e) => {
            if(this.enabled != true) return;
            callback({ dragSelectActive: true });
            const { x, y, ctrlKey, altKey } = e;
            this.selectionPoint = { x, y };
            this.meta = { ctrlKey, altKey };
            this.selectionDiv.style.left = x + "px";
            this.selectionDiv.style.top = y + "px";
            this.selectionDiv.style.width = "0px";
            this.selectionDiv.style.height = "0px";

            document.addEventListener("mousemove", mousemove);
            document.addEventListener("mouseup", mouseup);
        };

        const mousemove = (e) => {
            if(this.enabled != true) return;
            const x = this.clamp(e.x, 0, window.innerWidth - 2);
            const y = this.clamp(e.y, 0, window.innerHeight - 2);
            const width = Math.abs(this.selectionPoint.x - x);
            const height = Math.abs(this.selectionPoint.y - y);
            this.selectionDiv.style.width = width + "px";
            this.selectionDiv.style.height = height + "px";
            this.selectionDiv.style.visibility = "visible";
            this.selectionBgDiv.style.visibility = "visible";

            x < this.selectionPoint.x && (this.selectionDiv.style.left = x + "px");
            y < this.selectionPoint.y && (this.selectionDiv.style.top = y + "px");
        };

        const mouseup = (e) => {
            if(this.enabled != true) return;
            const { x, y } = e;
            const width = Math.abs(this.selectionPoint.x - x);
            const height = Math.abs(this.selectionPoint.y - y);
            this.selectionDiv.style.visibility = "hidden";
            this.selectionBgDiv.style.visibility = "hidden";

            const minSelectionSize = RectMarking.MIN_SELECTION_SIZE;
            if (width > minSelectionSize && height > minSelectionSize) {
                callback({
                    //x: x < this.selectionPoint.x ? x : this.selectionPoint.x,
                    //y: y < this.selectionPoint.y ? y : this.selectionPoint.y,
                    //width,
                    //height,
                    rect: this.selectionDiv.getBoundingClientRect(),
                    dragSelectComplete: true,
                    ...this.meta
                });
            } else {
                callback({ dragSelectActive: false });
            }

            document.removeEventListener("mousemove", mousemove);
            document.removeEventListener("mouseup", mouseup);
        };
    };

    setEnabled(enabled) {
        this.enabled = enabled;
    }
}

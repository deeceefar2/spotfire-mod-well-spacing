/*
 * Copyright © 2024. Cloud Software Group, Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

class ColorUtility {
    static hexToRgb(hexColor) {
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
     
        return `(${r},${g},${b})`
    }

    static hexIsLight(hexColor) {
        const rgb = this.hexToRgb(hexColor);
        return this.rgbIsLight(rgb);
    }

    static rgbIsLight(rgbColor) {
        const firstParen = rgbColor.indexOf('(') + 1;
        const lastParen = rgbColor.indexOf(')');
        let colors = rgbColor.substring(firstParen, lastParen); // let because it will be reassigned
        colors = colors.split(',');
        var luma = 0.2126 * parseInt(colors[0]) + 0.7152 * parseInt(colors[1]) + 0.0722 * parseInt(colors[2]); // per ITU-R BT.709
        return luma > 160;
    }
}

class DataUtility {
    // Deep clones an object, kind of
    static clone(aObject) {
        if (!aObject) return aObject;

        // Let because these will be reassigned
        let v;
        let bObject = Array.isArray(aObject) ? [] : {};
        for (const k in aObject) {
            v = aObject[k];
            bObject[k] = (typeof v === "object") ? clone(v) : v;
        }

        return bObject;
    };

    // Determines if the specified axis name has an expression
    static axisHasExpression(axes, name) {
        const axis = axes[name];
        if(axis != null && axis.parts != null && axis.parts.length > 0)
            return true;
        return false;
    };

    // Validates if the specified axis has an expression. If not, display
    //   an error message
    static validateAxisHasExpression(axes, name, onerror) {
        const hasExpression = DataUtility.axisHasExpression(axes, name);
        if(hasExpression == false) {
            onerror(`Mandatory Axis ${name} requires an expression`);
        }
        return hasExpression;
    };

    // Returns the color axis type, categorical or continuous
    static async getColorAxisType(dataView, axisName) {
        let axis = null; // let because it will be re-assigned

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
    static getColorValue(colorAxisType, row, axisName) {
        if(colorAxisType == 'categorical') {
            return row.categorical(axisName).formattedValue();
        }
        else {
            return row.continuous(axisName).value();
        }
    }

    // Determines if the background color is dark
    static isDarkCanvas(backgroundColor) {
        return !ColorUtility.hexIsLight(backgroundColor);
    }
}

class SVGUtility {
    // Converts svg coordinates into screen coordinates
    static svgToScreen(svg, svgX, svgY) {
        let p = svg.createSVGPoint()
        p.x = svgX;
        p.y = svgY;
        return p.matrixTransform(svg.getScreenCTM());
    }

    // Converts screen coordinates into svg coordinates
    static screenToSVG(svg, screenX, screenY) {
        let p = svg.createSVGPoint();
        p.x = screenX;
        p.y = screenY;
        return p.matrixTransform(svg.getScreenCTM().inverse());
    }
}

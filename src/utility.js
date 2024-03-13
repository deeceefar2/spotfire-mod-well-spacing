/*
 * Copyright © 2024. Cloud Software Group, Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

class Utility {
    static hexToRgb(hexColor) {
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
     
        return `(${r},${g},${b})`
    }

    static hexIsLight(hexColor) {
        let rgb = this.hexToRgb(hexColor);
        return this.rgbIsLight(rgb);
    }

    static rgbIsLight(rgbColor) {
        const firstParen = rgbColor.indexOf('(') + 1;
        const lastParen = rgbColor.indexOf(')');
        let colors = rgbColor.substring(firstParen, lastParen);
        colors = colors.split(',');
        var luma = 0.2126 * parseInt(colors[0]) + 0.7152 * parseInt(colors[1]) + 0.0722 * parseInt(colors[2]); // per ITU-R BT.709
        return luma > 160;
    }
}
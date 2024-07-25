/*
 * Copyright © 2024. Cloud Software Group, Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

/* This object is used to populate the default configuration on mod creation into the mod properties. */
const defaultConfiguration = {
    "rowLimit": 20000,
    "trellisDirection": "Columns",
    "maxTrellisCount": 10,
    "showTooltips": true,
    "showZoomX": false,
    "showZoomY": false,
    "diagram": {
        "showGridY": true,
        "showFormationLabels": true,
        "strokeDashArray": "4",
        "strokeWidth": 1.5,
        "wellSpacingPerpendicularNeighborLimit": 2,
        "wellSpacingHorizontalNeighborLimit": 1,
        "wellSpacingVerticalNeighborLimit": 1,
        "allowWellMarking": true,
        "allowFormationMarking": true,
    }

}

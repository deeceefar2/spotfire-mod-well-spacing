/*
 * Copyright © 2024. Cloud Software Group, Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

const defaultConfigurationTemplate = {
    "label": "Display",
    "rowLimit": {
        "label": "Row Limit",
        "datatype": "int",
        "minVal": 0
    },
    "trellisDirection": {
        "label": "Trellis Direction",
        "datatype": "string",
        "enumeration": [
            "Rows",
            "Columns"
        ]
    },
    "maxTrellisCount": {
        "label": "Max Trellis Panel Count",
        "datatype": "int",
        "minVal": 0
    },
    "showTooltips": {
        "label": "Show Tooltips",
        "datatype": "boolean"
    },
    "showZoomX": {
        "label": "Show X Axis Zoom",
        "datatype": "boolean"
    },
    "showZoomY": {
        "label": "Show Y Axis Zoom",
        "datatype": "boolean"
    },
    "diagram": {
        "label": "Well Spacing (\"Gun Barrel\") Diagram",
        "showGridY": {
            "label": "Show Grid Y",
            "datatype": "boolean"
        },
        "showFormationLabels": {
            "label": "Show Formation Labels",
            "datatype": "boolean"
        },
        "strokeDashArray": {
            "label": "Stroke Dash Array",
            "datatype": "string"
        },
        "strokeWidth": {
            "label": "Stroke Width",
            "datatype": "double"
        },
        "wellSpacingPerpendicularNeighborLimit": {
            "label": "Perpendicular Neighbor Limit",
            "datatype": "int",
            "enumeration": [1, 2]
        },
        "wellSpacingHorizontalNeighborLimit": {
            "label": "Horizontal Neighbor Limit",
            "datatype": "int",
            "enumeration": [1, 2]
        },
        "wellSpacingVerticalNeighborLimit": {
            "label": "Vertical Neighbor Limit",
            "datatype": "int",
            "enumeration": [1, 2]
        },
        "allowWellMarking": {
            "label": "Allow Well Marking",
            "datatype": "boolean"
        },
        "allowFormationMarking": {
            "label": "Allow Formation Marking",
            "datatype": "boolean"
        },
    }

}

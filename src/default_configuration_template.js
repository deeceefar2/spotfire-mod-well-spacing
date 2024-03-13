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
    "diagram": {
        "label": "Well Spacing (\"Gun Barrel\") Diagram",
        "showGridY": {
            "label": "Show Grid Y",
            "datatype": "boolean"
        },
        "strokeDashArray": {
            "label": "Stroke Dash Array",
            "datatype": "string"
        },
        "strokeWidth": {
            "label": "Stroke Width",
            "datatype": "double"
        }
    }

}

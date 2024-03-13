/*
 * Copyright © 2024. Cloud Software Group, Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

class VizConfiguration {
    static UI_MODE = 'form'; // basic | form

    constructor(contentElem, isEditing, onChangeCallback, hasAxisOverride) {        
        this.onChangeCallback = onChangeCallback;
        this.hasAxisOverride = hasAxisOverride;
        this.active = false;

        this.ui = new VizConfigurationUI(this, contentElem, isEditing, onChangeCallback);
        this.ui.draw();
    }

    // Sets the configuration from a configuration string
    setConfigurationStr(configStr) {
        // If configStr length is zero then it's a new mod so set to the default configuration object
        if(configStr == null || configStr.length == 0) {
            this.configuration = JSON.parse(JSON.stringify(defaultConfiguration));
            this.onChangeCallback(this.configuration);
        }
        else {
            this.configuration = JSON.parse(configStr)
        }

        // Set configuration on the UI
        this.ui.setConfiguration(this.configuration);
    }

    // Gets the configuration
    getConfiguration() {
        return this.configuration;
    }
}

class VizConfigurationUI {
    constructor(vizConfig, contentElem, isEditing, onChangeCallback) {
        this.vizConfig = vizConfig;
        this.contentElem = contentElem;
        this.isEditing = isEditing;
        this.onChangeCallback = onChangeCallback;

        this.vizElem = this.contentElem.querySelector('.visualization');
    }

    draw() {
        if(this.isEditing == false) return;
        this.drawIcon();
        this.drawConfiguration();
    }

    drawIcon() {
        const template = `
	        <svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" viewBox="0 0 24 24">
    		    <g>
          			<path d="M0,0h24v24H0V0z" fill="none"></path>
          			<path class="gear-icon" d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"></path>
        		</g>
      		</svg>
        `;

        let configIconElem = document.createElement('div');
        configIconElem.classList.add('configuration-icon');
        configIconElem.innerHTML = template.trim();        

        this.contentElem.appendChild(configIconElem);
        this.configIconElem = configIconElem;

        let self = this;
        configIconElem.onclick = function(event) {
            event.stopPropagation();
            self.viewConfiguration();
            configIconElem.style.display = 'none';
        };
    }

    drawConfiguration() {
        let self = this;

        let onDiscardCallback = function() {
            self.hideConfiguration();
        };

        let onSaveCallback = function(configObj) {
            self.vizConfig.configuration = configObj;
            self.hideConfiguration();
            self.onChangeCallback(configObj);
        }

        if(VizConfiguration.UI_MODE == 'basic') {
            this.ui = new VizConfigurationBasicUI(this.vizConfig, this.contentElem, onDiscardCallback, onSaveCallback);
        }
        else if(VizConfiguration.UI_MODE == 'form') {
            this.ui = new VizConfigurationFormUI(this.vizConfig, this.contentElem, onDiscardCallback, onSaveCallback);
        }

        this.configElem = this.ui.draw();
    }

    // Toggles the UI to view configuration
    viewConfiguration() {
        this.ui.display();
        this.vizElem.style.display = 'none';
        this.configElem.style.display = 'flex';
        this.configIconElem.style.display = 'none';
        this.vizConfig.active = true;
    }

    // Toggles the UI to view visualization
    hideConfiguration() {
        this.vizElem.style.display = 'flex';
        this.configElem.style.display = 'none';
        this.configIconElem.style.display = 'block';
        this.vizConfig.active = false;
    }

    // Sets a configuration object on the UI elements
    setConfiguration(configuration) {
        if(this.ui != null) {
            this.ui.setConfiguration(configuration);
        }
    }
}

class VizConfigurationBasicUI {
    constructor(vizConfig, contentElem, onDiscardCallback, onSaveCallback) {
        this.vizConfig = vizConfig;
        this.contentElem = contentElem;
        this.onDiscardCallback = onDiscardCallback;
        this.onSaveCallback = onSaveCallback;
    }

    draw() {
        const template = `
            <div class="title">Mod Configuration</div>  
            <div class="validation"></div>
            <div class="details">
                <textarea></textarea>
            </div>
            <div class="button">
                <button class="validate">Validate</button>           
                <button class="cancel">Cancel</button>           
                <button class="reset">Reset</button>           
                <button class="save" disabled>Save</button>           
            </div>`;

        // Append template
        let configElem = document.createElement('div');
        configElem.classList.add('configuration');
        configElem.innerHTML = template.trim();
        this.contentElem.appendChild(configElem);

        // Get config text area
        let configTextArea = configElem.querySelector('textarea');

        // Get validation text
        let validationTextElem = configElem.querySelector('.validation');

        // Prepare event handlers
        let self = this;

        // Event handler on cancel button
        let cancelButton = configElem.querySelector("button.cancel");
        cancelButton.onclick = function() {
            self.onDiscardCallback();
        };
    
        // Event handler on save button
        let saveButton = configElem.querySelector("button.save");
        saveButton.disabled = true;
        saveButton.onclick = function() {
            self.onSaveCallback(JSON.parse(configTextArea.value));
        };

        // Event handler on reset button
        let resetButton = configElem.querySelector("button.reset");
        resetButton.onclick = function() {
            configTextArea.value = JSON.stringify(defaultConfiguration, null, 2);
        };

        // Event handler on validate button
        let validateButton = configElem.querySelector("button.validate");
        validateButton.onclick = function() {
            let validation = self.validateConfiguration(configElem, configTextArea.value);
            saveButton.disabled = !validation.valid;
            validationTextElem.innerHTML = validation.message;
        };
    
        // Create setConfiguration function
        this.setConfiguration = function(configuration) {
            configTextArea.value = JSON.stringify(configuration, null, 2);
            saveButton.disabled = true;
        }

        // Create display function
        this.display = function() {
            validationTextElem.innerHTML = '';
            configElem.classList.remove('invalid');
            configElem.classList.remove('valid');
            saveButton.disabled = true;
        }

        return configElem;
    }

    // Validates the specified configuration for JSON adherence
    validateConfiguration(configElem, configStr) {
        let thisConfig = configStr;
        if(thisConfig == null)
            thisConfig = '';
        
        try {
            JSON.parse(thisConfig);
            configElem.classList.remove('invalid');
            configElem.classList.add('valid');
            return {valid: true, message: 'OK'};
        }
        catch(err) {
            configElem.classList.remove('valid');
            configElem.classList.add('invalid');
            return {valid: false, message: err.message};
        }
    }
}

class VizConfigurationFormUI {
    constructor(vizConfig, contentElem, onDiscardCallback, onSaveCallback) {
        this.vizConfig = vizConfig;
        this.contentElem = contentElem;
        this.onDiscardCallback = onDiscardCallback;
        this.onSaveCallback = onSaveCallback;
    }

    draw() {
        const template = `
            <div class="form"></div>  
            <div class="button">
                <button class="close">Close</button>           
                <button class="reset">Reset</button>           
            </div>`;

        // Append template
        let configElem = document.createElement('div');
        configElem.classList.add('configuration');
        configElem.innerHTML = template.trim();
        this.contentElem.appendChild(configElem);

        // Get form element
        let configFormElem = configElem.querySelector('.form');

        // Prepare event handlers
        let self = this;

        // Event handler on close button
        let closeButton = configElem.querySelector("button.close");
        closeButton.onclick = function() {
            self.onSaveCallback(self.configuration);
        };
    
        // Event handler on reset button
        let resetButton = configElem.querySelector("button.reset");
        resetButton.onclick = function() {
            self.setConfiguration(JSON.parse(JSON.stringify(defaultConfiguration)));
            self.display();
        };

        // Create setConfiguration function
        this.setConfiguration = function(configuration) {
            self.configuration = configuration;
        }

        // Create display function
        this.display = function() {
            configFormElem.innerHTML = '';
            self.appendElements(configFormElem, self.configuration, defaultConfigurationTemplate)
        }

        return configElem;
    }

    // Draw elements
    appendElements(parentFormElem, configurationObj, configurationTemplate) {
        if(configurationTemplate != null && configurationTemplate.label != null) {
            let groupLabelElem = document.createElement('div');
            groupLabelElem.classList.add('group-label');
            groupLabelElem.innerHTML = configurationTemplate.label;
            parentFormElem.appendChild(groupLabelElem);            
        }

        // Iterate over the keys in the configuration
        for(let thisKey in configurationTemplate) {
            if(thisKey == 'label') continue;
            let thisConfigTemplate = configurationTemplate[thisKey];
            let overridden = false;
            if(thisConfigTemplate.axisOverride != null) {
                overridden = this.vizConfig.hasAxisOverride(thisConfigTemplate.axisOverride);
            }

            if(thisConfigTemplate != null && thisConfigTemplate.datatype != null) {
                this.appendFormElement(parentFormElem, configurationObj, thisKey, thisConfigTemplate, overridden);
            }
            else {
                this.appendElements(parentFormElem, configurationObj[thisKey], thisConfigTemplate);
            }
        }
    }

    // Draw form element
    appendFormElement(parentFormElem, configurationObj, configMemberKey, configTemplate, overridden) {
        if(overridden == true) return;

        let formElem = document.createElement('div');
        formElem.classList.add('form-element');
        parentFormElem.appendChild(formElem);

        let formLabelElem = document.createElement('div');
        formLabelElem.classList.add('label');
        formLabelElem.innerHTML = configTemplate.label;
        formElem.appendChild(formLabelElem);
        
        let formDataElem = document.createElement('div');
        formDataElem.classList.add('data');
        formElem.appendChild(formDataElem);
        
        // Choose UI element based on type
        if(configTemplate.enumeration != null) {
            this.appendEnumerationForm(formDataElem, configurationObj, configMemberKey, configTemplate);
        }
        else if(configTemplate.datatype == 'boolean') {
            this.appendBooleanForm(formDataElem, configurationObj, configMemberKey, configTemplate);
        }
        else {
            this.appendInputForm(formDataElem, configurationObj, configMemberKey, configTemplate);
        }
    }

    appendEnumerationForm(formDataElem, configurationObj, configMemberKey, configTemplate) {
        // Select
        formDataElem.classList.add('select');

        let selectElem = document.createElement('select');
        formDataElem.appendChild(selectElem);

        for(let thisEnumItem of configTemplate.enumeration) {
            let optionElem = document.createElement('option');
            optionElem.innerHTML = thisEnumItem;
            selectElem.appendChild(optionElem);

            if(configurationObj[configMemberKey] == thisEnumItem) {
                optionElem.setAttribute('selected', true);
            }  
        }

        // Change listener to push new value to config object
        selectElem.onchange = function() {
            configurationObj[configMemberKey] = selectElem.value;
        };
    }

    appendBooleanForm(formDataElem, configurationObj, configMemberKey, configTemplate) {
        // Checkbox
        formDataElem.classList.add('checkbox');

        let checkboxElem = document.createElement('input');
        checkboxElem.setAttribute('type', 'checkbox');
        formDataElem.appendChild(checkboxElem);
        checkboxElem.checked = configurationObj[configMemberKey];
        
        // Change listener to push new value to config object
        checkboxElem.onchange = function() {
            configurationObj[configMemberKey] = checkboxElem.checked;
        };
    }

    appendInputForm(formDataElem, configurationObj, configMemberKey, configTemplate) {
        // Input
        formDataElem.classList.add('input');

        let inputElem = document.createElement('input');
        formDataElem.appendChild(inputElem);
        inputElem.value = configurationObj[configMemberKey];

        // If numeric apply restriction
        if(configTemplate.datatype == 'int' || configTemplate.datatype == 'double') {
            inputElem.setAttribute('type', 'number');
        }

        // Change listener to push new value to config object
        inputElem.oninput = function() {
            if(configTemplate.datatype == 'int')
                configurationObj[configMemberKey] = parseInt(inputElem.value);
            else if(configTemplate.datatype == 'double')
                configurationObj[configMemberKey] = parseFloat(inputElem.value);
            else
                configurationObj[configMemberKey] = inputElem.value;
        };
    }
}
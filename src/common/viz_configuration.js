/*
 * Copyright © 2024. Cloud Software Group, Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

class VizConfiguration {
    static UI_MODE = 'form'; // basic | form

    // Event types
    static CONFIG_CHANGE_EVENT = 'configchange';

    // Declare properties
    #axes;                  // Axes in the viz to test for override
    #ui;                    // UI object

    #active = false;        // Active flag if configuration panel is displayed
    #configuration;         // Configuration object

    #eventListeners = {};   // Event listeners


    constructor(mainElem, contentElem, isEditing, axes) {        
        this.#axes = axes;

        this.#ui = new VizConfigurationUI(this, mainElem, contentElem, isEditing);
        this.#ui.draw();
    }

    // Sets the configuration from an object
    setConfiguration(configurationObj) {
        this.#configuration = configurationObj;
    }

    // Sets the configuration from a configuration string
    setConfigurationStr(configStr) {
        // If configStr length is zero then it's a new mod so set to the default configuration object
        if(configStr == null || configStr.length == 0) {
            this.setConfiguration(JSON.parse(JSON.stringify(defaultConfiguration)));
            this.notifyListeners(VizConfiguration.CONFIG_CHANGE_EVENT);
        }
        else {
            this.setConfiguration(JSON.parse(configStr));
        }

        // Set configuration on the UI
        this.#ui.setConfiguration(this.getConfiguration());
    }

    // Gets the configuration
    getConfiguration() {
        return this.#configuration;
    }

    // Sets the active flag
    setActive(flag) {
        this.#active = flag;
    }

    // Returns the active flag
    isActive() {
        return this.#active;
    }

    // Has axis override
    hasAxisOverride(name) {
        const axis = this.#axes[name];
        if(axis != null && axis.parts != null && axis.parts.length > 0)
            return true;
        return false;
    }

    // Notify listeners
    notifyListeners(eventName) {
        const e = {
            name: eventName,
            configuration: this.getConfiguration()
        }

        const eventListenerList = this.#eventListeners[eventName];
        if(eventListenerList != null) {
            for(let thisEventListener of eventListenerList) {
                thisEventListener(e);
            }
        }
    }

    // Register event listener
    addEventListener(eventName, callback) {
        const eventNames = [VizConfiguration.CONFIG_CHANGE_EVENT];
        if(eventNames.includes(eventName) == false) return;

        let eventListenerList = this.#eventListeners[eventName];
        if(eventListenerList == null) {
            eventListenerList = [];
            this.#eventListeners[eventName] = eventListenerList;
        }

        eventListenerList.push(callback);
    }

}

class VizConfigurationUI {
    #vizConfig;         // VizConfiguration object (not used on this UI)
    #mainElem;          // Content element
    #contentElem;       // Main visualization element
    #isEditing;         // is editing flag

    #configIconElem;    // Configuration icon element
    #configElem;        // Configuration element
    #ui;                // UI object

    constructor(vizConfig, mainElem, contentElem, isEditing) {
        this.#vizConfig = vizConfig;
        this.#mainElem = mainElem;
        this.#contentElem = contentElem;
        this.#isEditing = isEditing;
    }

    draw() {
        if(this.#isEditing == false) return;
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

        const configIconElem = document.createElement('div');
        configIconElem.classList.add('configuration-icon');
        configIconElem.innerHTML = template.trim();        

        this.#mainElem.appendChild(configIconElem);
        this.#configIconElem = configIconElem;

        const self = this;
        configIconElem.addEventListener('click', function(event) {
            event.stopPropagation();
            self.viewConfiguration();
            configIconElem.style.display = 'none';
        });
    }

    drawConfiguration() {
        const self = this;

        const onDiscardCallback = function() {
            self.hideConfiguration();
        };

        const onSaveCallback = function(configObj) {
            self.#vizConfig.setConfiguration(configObj);
            self.hideConfiguration();
            self.#vizConfig.notifyListeners(VizConfiguration.CONFIG_CHANGE_EVENT, self.#vizConfig);
        }

        if(VizConfiguration.UI_MODE == 'basic') {
            this.#ui = new VizConfigurationBasicUI(this.#vizConfig, this.#mainElem, onDiscardCallback, onSaveCallback);
        }
        else if(VizConfiguration.UI_MODE == 'form') {
            this.#ui = new VizConfigurationFormUI(this.#vizConfig, this.#mainElem, onDiscardCallback, onSaveCallback);
        }

        this.#configElem = this.#ui.draw();
    }

    // Toggles the UI to view configuration
    viewConfiguration() {
        this.#ui.display();
        this.#contentElem.style.display = 'none';
        this.#configElem.style.display = 'flex';
        this.#configIconElem.style.display = 'none';
        
        this.#vizConfig.setActive(true);
    }

    // Toggles the UI to view visualization
    hideConfiguration() {
        this.#contentElem.style.display = 'flex';
        this.#configElem.style.display = 'none';
        this.#configIconElem.style.display = 'block';
        
        this.#vizConfig.setActive(false);
    }

    // Sets a configuration object on the UI elements
    setConfiguration(configuration) {
        if(this.#ui != null) {
            this.#ui.setConfiguration(configuration);
        }
    }

}

class VizConfigurationBasicUI {
    // Declare properties
    #vizConfig;         // VizConfiguration object (not used on this UI)
    #mainElem;          // Content element
    #onDiscardCallback; // Callback when configuration is discarded
    #onSaveCallback;    // Callback when configuration is saved

    constructor(vizConfig, mainElem, onDiscardCallback, onSaveCallback) {
        this.#vizConfig = vizConfig;
        this.#mainElem = mainElem;
        this.#onDiscardCallback = onDiscardCallback;
        this.#onSaveCallback = onSaveCallback;
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
        const configElem = document.createElement('div');
        configElem.classList.add('configuration');
        configElem.innerHTML = template.trim();
        this.#mainElem.appendChild(configElem);

        // Get config text area
        const configTextArea = configElem.querySelector('textarea');

        // Get validation text
        const validationTextElem = configElem.querySelector('.validation');

        // Prepare event handlers
        const self = this;

        // Event handler on cancel button
        const cancelButton = configElem.querySelector("button.cancel");
        cancelButton.addEventListener('click', function() {
            self.#onDiscardCallback();
        });
    
        // Event handler on save button
        const saveButton = configElem.querySelector("button.save");
        saveButton.disabled = true;
        saveButton.addEventListener('click', function() {
            self.#onSaveCallback(JSON.parse(configTextArea.value));
        });

        // Event handler on reset button
        const resetButton = configElem.querySelector("button.reset");
        resetButton.addEventListener('click', function() {
            configTextArea.value = JSON.stringify(defaultConfiguration, null, 2);
        });

        // Event handler on validate button
        const validateButton = configElem.querySelector("button.validate");
        validateButton.addEventListener('click', function() {
            const validation = self.validateConfiguration(configElem, configTextArea.value);
            saveButton.disabled = !validation.valid;
            validationTextElem.innerHTML = validation.message;
        });
    
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
        let thisConfig = configStr; // let because it may be reassigned
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
    // Declare properties
    #vizConfig;         // VizConfiguration object
    #mainElem;          // Content element
    #onDiscardCallback; // Callback when configuration is discarded (not used on this UI)
    #onSaveCallback;    // Callback when configuration is saved

    #configuration;

    constructor(vizConfig, mainElem, onDiscardCallback, onSaveCallback) {
        this.#vizConfig = vizConfig;
        this.#mainElem = mainElem;
        this.#onDiscardCallback = onDiscardCallback;
        this.#onSaveCallback = onSaveCallback;
    }

    draw() {
        const template = `
            <div class="form"></div>  
            <div class="button">
                <button class="close">Close</button>           
                <button class="reset">Reset</button>           
            </div>`;

        // Append template
        const configElem = document.createElement('div');
        configElem.classList.add('configuration');
        configElem.innerHTML = template.trim();
        this.#mainElem.appendChild(configElem);

        // Get form element
        const configFormElem = configElem.querySelector('.form');

        // Prepare event handlers
        const self = this;

        // Event handler on close button
        const closeButton = configElem.querySelector("button.close");
        closeButton.addEventListener('click', function() {
            self.#onSaveCallback(self.#configuration);
        });
    
        // Event handler on reset button
        const resetButton = configElem.querySelector("button.reset");
        resetButton.addEventListener('click', function() {
            self.setConfiguration(JSON.parse(JSON.stringify(defaultConfiguration)));
            self.display();
        });

        // Set the configuration object
        this.setConfiguration = function(configuration) {
            self.#configuration = configuration;
        }

        // Display the form
        this.display = function() {
            configFormElem.innerHTML = '';
            self.appendElements(configFormElem, self.#configuration, defaultConfigurationTemplate)
        }

        return configElem;
    }

    // Draw elements
    appendElements(parentFormElem, configurationObj, configurationTemplate) {
        if(configurationTemplate != null && configurationTemplate.label != null) {
            const groupLabelElem = document.createElement('div');
            groupLabelElem.classList.add('group-label');
            groupLabelElem.innerHTML = configurationTemplate.label;
            parentFormElem.appendChild(groupLabelElem);            
        }

        // Iterate over the keys in the configuration
        for(let thisKey in configurationTemplate) {
            if(thisKey == 'label') continue;
            const thisConfigTemplate = configurationTemplate[thisKey];
            let overridden = false; // let because it may be reassigned
            if(thisConfigTemplate.axisOverride != null) {
                overridden = this.#vizConfig.hasAxisOverride(thisConfigTemplate.axisOverride);
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

        const formElem = document.createElement('div');
        formElem.classList.add('form-element');
        parentFormElem.appendChild(formElem);

        const formLabelElem = document.createElement('div');
        formLabelElem.classList.add('label');
        formLabelElem.innerHTML = configTemplate.label;
        formElem.appendChild(formLabelElem);
        
        const formDataElem = document.createElement('div');
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

    // Draw enumeration form
    appendEnumerationForm(formDataElem, configurationObj, configMemberKey, configTemplate) {
        // Select
        formDataElem.classList.add('select');

        const selectElem = document.createElement('select');
        formDataElem.appendChild(selectElem);

        for(let thisEnumItem of configTemplate.enumeration) {
            const optionElem = document.createElement('option');
            optionElem.innerHTML = thisEnumItem;
            selectElem.appendChild(optionElem);

            if(configurationObj[configMemberKey] == thisEnumItem) {
                optionElem.setAttribute('selected', true);
            }  
        }

        // Change listener to push new value to config object
        selectElem.addEventListener('change', function() {
            configurationObj[configMemberKey] = selectElem.value;
        });
    }

    // Draw boolean form
    appendBooleanForm(formDataElem, configurationObj, configMemberKey, configTemplate) {
        // Checkbox
        formDataElem.classList.add('checkbox');

        const checkboxElem = document.createElement('input');
        checkboxElem.setAttribute('type', 'checkbox');
        formDataElem.appendChild(checkboxElem);
        checkboxElem.checked = configurationObj[configMemberKey];
        
        // Change listener to push new value to config object
        checkboxElem.addEventListener('change', function() {
            configurationObj[configMemberKey] = checkboxElem.checked;
        });
    }

    // Draw input form
    appendInputForm(formDataElem, configurationObj, configMemberKey, configTemplate) {
        // Input
        formDataElem.classList.add('input');

        const inputElem = document.createElement('input');
        formDataElem.appendChild(inputElem);
        inputElem.value = configurationObj[configMemberKey];

        // If numeric apply restriction
        if(configTemplate.datatype == 'int' || configTemplate.datatype == 'double') {
            inputElem.setAttribute('type', 'number');
        }

        // Change listener to push new value to config object
        inputElem.addEventListener('input', function() {
            if(configTemplate.datatype == 'int')
                configurationObj[configMemberKey] = parseInt(inputElem.value);
            else if(configTemplate.datatype == 'double')
                configurationObj[configMemberKey] = parseFloat(inputElem.value);
            else
                configurationObj[configMemberKey] = inputElem.value;
        });
    }
}
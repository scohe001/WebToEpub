/*
    Main processing handler for popup.html

*/
var main = (function () {
    "use strict";

    // this will be called when message listener fires
    var onMessageListener = null;

    // details 
    let initalWebPage = null;
    let parser = null;

    // register listener that is invoked when script injected into HTML sends its results 
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (request.messageType == "ParseResults") {
            console.log("addListener");
            console.log(request);
            if (onMessageListener != null) {
                onMessageListener(request);
            }
        }
    });

    // extract urls from DOM and populate control
    function processInitialHtml(url, dom) {
        if (setParser(url)) {
            let metaInfo = parser.getEpubMetaInfo(dom);
            populateMetaInfo(metaInfo);
            parser.populateUI();
            parser.onLoadFirstPage(url, dom);
        }
    }

    function populateMetaInfo(metaInfo) {
        document.getElementById("startingUrlInput").value = metaInfo.uuid;
        document.getElementById("titleInput").value = metaInfo.title;
        document.getElementById("authorInput").value = metaInfo.author;
        document.getElementById("languageInput").value = metaInfo.language;
        document.getElementById("fileNameInput").value = metaInfo.fileName;
    }

    function metaInfoFromContorls() {
        let metaInfo = new EpubMetaInfo();
        metaInfo.uuid = document.getElementById("startingUrlInput").value;
        metaInfo.title = document.getElementById("titleInput").value;
        metaInfo.author = document.getElementById("authorInput").value;
        metaInfo.language = document.getElementById("languageInput").value;
        metaInfo.fileName = document.getElementById("fileNameInput").value;
        return metaInfo;
    }

    function packEpub() {
        let metaInfo = metaInfoFromContorls();
        try {
            let epub = new EpubPacker(metaInfo);
            epub.assembleAndSave(metaInfo.fileName, parser.epubItemSupplier());
        } catch (error) {
            alert("Error packing EPUB. Error: " + error.stack);
        }
    }

    function getActiveTabDOM() {
        chrome.tabs.executeScript({file: "js/ContentScript.js"});
    }

    function populateControls() {
        // set up handler to get the response from our injected content script
        onMessageListener = function (message) {
            // convert the string returned from content script back into a DOM
            initalWebPage = new DOMParser().parseFromString(message.document, "text/html");

            // set the base tag, in case server did not supply it 
            new HttpClient().setBaseTag(message.url, initalWebPage);
            processInitialHtml(message.url, initalWebPage);
        };
        getActiveTabDOM();
    }

    function setParser(url) {
        let parsers = ParserFactory(url);
        if (parsers.length === 0) {
            alert("No parser found for this URL.");
        } else {
            if (parsers.length > 1) {
                alert("Multiple parsers found for this URL.");
            }
            parser = parsers[0];
        }
        return parser !== null;
    }

    // called when the "Diagnostics" check box is ticked or unticked
    function onDiagnosticsClick() {
        let enable = document.getElementById("diagnosticsCheckBoxInput").checked;
        document.getElementById("reloadButton").hidden = !enable;
        document.getElementById("packRawButton").hidden = !enable;
        document.getElementById("testToXhtmlButton").hidden = !enable;
    }

    function getPackEpubButton() {
        return document.getElementById("packEpubButton");
    }

    // actions to do when window opened
    window.onload = function () {
        // add onClick event handlers
        getPackEpubButton().onclick = packEpub;
        document.getElementById("diagnosticsCheckBoxInput").onclick = onDiagnosticsClick;
        document.getElementById("reloadButton").onclick = populateControls;
        populateControls();
    }

    return {
        getPackEpubButton: getPackEpubButton
    };
})();


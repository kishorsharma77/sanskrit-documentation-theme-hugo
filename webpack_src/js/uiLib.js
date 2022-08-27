import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'tachyons/css/tachyons.min.css';

// The below don't yield equally good results, so omitting.
// import '@fortawesome/fontawesome-free/js/fontawesome';
// import '@fortawesome/fontawesome-free/js/solid';
// import "../css/fonts.css";
import "../css/treeview.css";
import "../css/class_styles.css";

import * as query from "./query";
import * as transliteration from "./transliteration";
import {setInlineComments} from "./comments";
import * as audioEmbed from "./audioEmbed";
import * as videoEmbed from "./videoEmbed";
import * as spreadsheets from "./spreadsheets";
import {updateToc} from "./toc";
import * as dirTree from "./dirTree";
import * as sidebar from "./sidebar";
import * as search from "./search";
import handleIncludes from "./handleIncludes";
import {redirectToPage, redirectToRandomPage} from "./redirect";
import * as comments from "./comments";
import * as textToSpeech from "./textToSpeech";

export function relUrlOfCurrentPage() {
  return document.location.href.split("#")[0].replace(baseURL, "/");
}

// No includes processing - or adding navigation bars.
export function prepareContentWithoutIncludes(node) {
  if (!node) {
    node = document.body;
    transliteration.loadLipi();
  }
  // setting node.outerHTML will cause later calls to fail!
  node.innerHTML = setInlineComments(node.innerHTML);
  transliteration.transliterate(node);
  audioEmbed.fillAudioEmbeds(node);
  videoEmbed.fillVideoEmbeds(node);
  spreadsheets.fillSheets(node);
}

export function finalizePagePostInclusion() {
  expandAllDetails(document.querySelector("body main"));
  setPrintLayoutFromQuery(document.body);
  updateToc();
}

export async function preLoadTasks() {
  console.log("preLoadTasks");
  await dirTree.populateTree();
  pageVars.pageParams = dirTree.getPageParams(pageVars.pageUrlMinusBasePath);
  pageVars.sidebarId = pageVars.pageParams.sidebar || pageDefaults.sidebar;
  pageVars.topnavId = pageVars.pageParams.topnav || pageDefaults.topnav;
  pageVars.footernavId = pageVars.pageParams.footernav || pageDefaults.footernav;
  pageVars.unicodeScript = pageVars.pageParams.unicode_script || pageDefaults.unicode_script;
}

export async function onDocumentReadyTasks() {
  await preLoadTasks();
  sidebar.insertSidebarItems();
  sidebar.setupSidebarToggle();
  search.setupTitleSearch();
  let nextPage = dirTree.getNextPage(pageVars.pageUrlMinusBasePath);
  dirTree.setAnchor(document.getElementById("nextPage"), nextPage, ">");
  let previousPage = dirTree.getPreviousPage(pageVars.pageUrlMinusBasePath);
  dirTree.setAnchor(document.getElementById("previousPage"), previousPage, "<");

  if (pageVars.topnavId && sidebarsData[pageVars.topnavId]) {
    sidebar.insertNavItems("#top-bar-right-custom", sidebarsData[pageVars.topnavId]);
  }
  if (pageVars.footernavId && sidebarsData[pageVars.footernavId]) {
    sidebar.insertNavItems("#footer-bar-right-custom", sidebarsData[pageVars.footernavId]);
  }
  if (pageVars.unicodeScript) {
    document.querySelector("#post_content").setAttribute("unicode_script", pageVars.unicodeScript);
  }
  prepareContentWithoutIncludes();
  if (!handleIncludes()) {
    // handleIncludes spawns threads which independently call the below.
    finalizePagePostInclusion();
  }
}

export function replaceWithQueryParam(queryFieldName, regexPattern) {
  let value = query.getParam(queryFieldName);
  if (value) {
    document.body.innerHTML = document.body.innerHTML.replace(regexPattern, value);
    // WARNING: Because of the above replacement(?), the below does not work as of 202202. Employ some other idea.
    let inputField = document.getElementById(`input_${queryFieldName}`);
    console.log("replaceWithQueryParam", queryFieldName, value, inputField, Boolean(inputField), document.getElementById(`input_${queryFieldName}`).value);
    if (inputField) {
      inputField.value = value;
      // document.getElementById(`input_${queryFieldName}`).value = value;
    }
  }
}

export function setPrintLayoutFromQuery(node) {
  let printLayout = query.getParam("printLayout") || "off";
  if (printLayout != "on") {
    return;
  }
  [...node.querySelectorAll(".noPrint")].forEach(function (e) {
    e.setAttribute("hidden", "true");
  });
  [...node.querySelectorAll("#disqus_thread")].forEach(function (e) {
    e.setAttribute("hidden", "true");
  });
  [...node.getElementsByTagName("summary")].forEach(function (e) {
    if (!e.parentNode.hasAttribute("open")) {
      e.parentNode.hidden = true;
    } else {
      e.hidden = true;
    }
  });
  [...node.getElementsByClassName("fa-external-link-square-alt")].forEach(function (e) {
    e.parentNode.hidden = true;
  });

}

export function expandAllDetails(node) {
  let expandAll = query.getParam("expandAll") || "false";
  if (expandAll != "true") {
    return;
  }
  [...node.getElementsByTagName("details")].forEach(function (e) {
    if (e.hasAttribute("open")) {
      e.setAttribute("preOpened", "true");
    } else {
      e.setAttribute("open", "true");
    }
  });
  if (node.tagName.toLocaleLowerCase() == "body") {
    document.querySelector("#expandAllButton").onclick = function () {
      query.deleteParamAndGo("expandAll");
    };
  }
}

export function getFontSize(element) {
  let size = parseFloat(window.getComputedStyle(element, null).getPropertyValue('font-size'));
  return size
}


export function changeTextSize(diff) {
  let postContent = document.getElementById("post_content");
  let size = getFontSize(postContent);
  console.debug(size);
  size = size + diff;
  if (size <= 10) {
    size = 10;
  }
  postContent.style.fontSize = size + "px";
}

// So that these can be used like module_uiLib.default.redirectToPage(..).
export default {
  navigation: {
    sidebarToggleHandler: sidebar.sidebarToggleHandler,
    pageLoader: search.pageLoader,
    redirectToPage: redirectToPage,
    redirectToRandomPage: redirectToRandomPage
  },
  content: {
    updateTransliteration: transliteration.updateTransliteration,
    handleSpeakToggle: textToSpeech.handleSpeakToggle,
    updateCommentStyleFromDropdown: comments.updateCommentStyleFromDropdown,
    getPageParams: dirTree.getPageParams,
    changeTextSize: changeTextSize,
  },
  query: {
    removeParamAndGo: query.deleteParamAndGo,
    setParamsAndGo: query.setParamsAndGo,
    getParam: query.getParam,
  }
}

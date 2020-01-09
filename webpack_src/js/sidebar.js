import urljoin from 'url-join';
import * as dirTree from "./dirTree";

function getTitle(sidebarItem) {
    var title = sidebarItem.title;
    if (!title) {
        // console.debug(sidebarItem);
        let itemUrlStripped = "#";
        let isDirItem = false;
        if (sidebarItem.url) {
            itemUrlStripped = sidebarItem.url;
        } else if (sidebarItem.contents && sidebarItem.contents[0].url) {
            itemUrlStripped = sidebarItem.contents[0].url.replace("recdir://", "/").replace("dir://", "/");
            isDirItem = true;
        }
        let pageParams = dirTree.getPageParams(itemUrlStripped);
        // console.debug(sidebarItem, childTree);
        if ("title" in pageParams) {
            title = pageParams["title"];
            if(isDirItem && title.startsWith("+")) {
                title = title.substr(1);
            }
        } else {
            console.error(itemUrlStripped, `${itemUrlStripped} not present in dir tree. Something is wrong with the sidebar definition. So can't figure out title.`, sidebarItem);
            title = "UNK";
        }
    }
    return title;
}

function titleSorter(a, b) {
    return getTitle(a).localeCompare(getTitle(b));
}

function getHtmlForContentsProperty(sidebarItem, parentListIdIn, anchorClasses, liClass) {
    let finalUrl = sidebarItem.url || "#";
    var itemUrlStripped = finalUrl;
    var parentListId = parentListIdIn || "sb";
    var contentHtml = "";
    var title = getTitle(sidebarItem);
    let ulClass = "list pl2";

    // If the listId included devanAgarI characters, collapsing and uncollapsing would not work for some unknown reason. So, we use random numbers as ids.
    var listId = `${parentListId}_${Math.floor(Math.random() * 10000)}`;
    for (let subitem of sidebarItem.contents) {
        contentHtml = `${contentHtml}\n ${getSidebarItemHtml(subitem, listId)}`;
    }
    // console.debug(title, itemUrlStripped);
    var itemTitleHtml;
    if (itemUrlStripped != "#") {
        itemTitleHtml = `<a href="${finalUrl}" class="${anchorClasses}"> ${title}</a>`;
    } else {
        itemTitleHtml = `<a data-toggle="collapse" href="#${listId}" role="button" aria-expanded="false" aria-controls="${listId}"  class="${anchorClasses}"> ${title}</a>`;
    }
    var itemHtml =
        `<li class="${liClass}"><span class="d-flex justify-content-between">` +
        itemTitleHtml + "\n" +
        `<a data-toggle="collapse" href="#${listId}" role="button" aria-expanded="false" aria-controls="${listId}"> <i class="fas fa-caret-down"></i></a>` +
        "</span>\n" +
        `<ul id='${listId}' class='${ulClass} collapse'>${contentHtml}\n</ul>\n` +
        `</li>\n`;
    return itemHtml;
}

function getHtmlForDirProperty(sidebarItem) {
    var itemHtml = "";
    // console.debug(sidebarItem);
    var dirUrl = sidebarItem.url.replace("dir://", "/");
    if (!dirUrl.endsWith("/")) {
        dirUrl = dirUrl + "/";
    }
    // console.debug(dirUrl);
    // Note that only pages parsed and generated by jekyll are processed below - not ready files like pdf-s and htmls.
    let childTree = dirTree.getChildTree(dirUrl);
    var childPages = dirTree.getNonDirPageKeys(childTree);
    let childPageItems = childPages.map(x => {return {"url": `${dirUrl}${x}/`}});
    console.debug(dirUrl, childTree, childPages,childPageItems);
    let subitem = {"url": dirUrl};
    itemHtml = `${itemHtml}\n${getSidebarItemHtml(subitem)}`;
    for (let childPageItem of childPageItems.sort(titleSorter)) {
        itemHtml = `${itemHtml}\n${getSidebarItemHtml(childPageItem)}`;
    }
    if (childPages.length == 0 ){
        console.warn(`Directory ${dirUrl} has only one item.`, childPages, childTree);
    }
    return itemHtml;
}

function getHtmlForRecdirProperty(sidebarItem, childDirsSuperset) {
    var itemHtml = "";
    var dirUrl = sidebarItem.url.replace("recdir://", "/");
    if (!dirUrl.endsWith("/")) {
        dirUrl = dirUrl + "/";
    }
    itemHtml = getHtmlForDirProperty({"url": `dir:/${dirUrl}`});

    let childTree = dirTree.getChildTree(dirUrl);
    var childDirKeys = dirTree.getChildDirKeys(childTree);
    let childDirItems = childDirKeys.map(x => {return {"contents": [{"url": `recdir:/${dirUrl}${x}/`}]}});
    // console.debug(childDirs);
    for (let childDirItem of childDirItems.sort(titleSorter)) {
        itemHtml = `${itemHtml}\n${getSidebarItemHtml(childDirItem)}`;
    }
    return itemHtml;
}


function getSidebarItemHtml(sidebarItem, parentListIdIn) {
    let finalUrl = sidebarItem.url || "#";
    var itemUrlStripped = finalUrl;
    let isExternalLink = finalUrl.startsWith("http") || finalUrl.startsWith("ftp");
        
    if (!isExternalLink) {
        itemUrlStripped = itemUrlStripped.replace("_index.md.html", "").replace("_index.md.md", "").replace(".md", "/");
        finalUrl = urljoin(baseURL, itemUrlStripped);
    }

    // console.debug(itemUrlStripped);
    let anchorClasses = "";
    var liClass = "inactive";  // list-group-item-* is a bootstrap class.
    if (pageUrlMinusBasePath == itemUrlStripped) {
        liClass = "active underline";
    }
    // console.debug(sidebarItem);
    if(sidebarItem.hasOwnProperty("contents")) {
        return getHtmlForContentsProperty(sidebarItem, parentListIdIn, anchorClasses, liClass);
    }
    if (!sidebarItem.url) {
        console.error("Strange sidebarItem with no url or contents fields!", sidebarItem);
        return "";
    }
    if (sidebarItem.url.startsWith("dir://")) {
        return getHtmlForDirProperty(sidebarItem);
    }
    if (sidebarItem.url.startsWith("recdir://")) {
        return getHtmlForRecdirProperty(sidebarItem);
    }
    
    // Finally, the default case.
    // console.debug(baseURL +itemUrlStripped);
    var title = getTitle(sidebarItem);
    var itemHtml = `<li class="${liClass}"><a href="${finalUrl }"  class="${anchorClasses}" target="">${title}</a></li>`;
    return itemHtml;
}

export function insertSidebarItems() {
    var sidebar = sidebarsData[sidebarId];
    // $("#sidebarTitle a").html(sidebar.title);
    // console.debug(sidebar);
    if ($("#displayed_sidebar li").length > 0) {
        console.warn("Exiting without reinserting items.");
        return;
    }
    for (let sidebarItem of sidebar.contents) {
        $("#displayed_sidebar").append(getSidebarItemHtml(sidebarItem));
    }

    // this highlights the active parent class in the navgoco sidebar. this is critical so that the parent expands when you're viewing a page.
    $("li.active").parents('li').addClass("active");
    $("li.active").parents('li').removeClass("inactive");
    // console.debug($("li.active").parents('ul'));
    $("li.active").parents('ul').removeClass("collapse");
}

export function insertNavItems(navbarId, items) {
    if (topnavId && !$(navbarId).attr("addedCustomItems")) {
        // console.debug(topnavDropdown);
        for (let item of items) {
            $(navbarId).append(getSidebarItemHtml(item));
        }
        $(navbarId).attr("addedCustomItems", "true");
    }
}

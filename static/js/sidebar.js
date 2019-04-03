function getSidebarItemHtml(sidebarItem, parentListIdIn) {
    var parentListId = parentListIdIn || "sb";
    let finalUrl = sidebarItem.url || "#";
    var itemUrlStripped = finalUrl;
    let isExternalLink = finalUrl.startsWith("http") || finalUrl.startsWith("ftp");
        
    if (!isExternalLink) {
        itemUrlStripped = itemUrlStripped.replace("index.html", "").replace("index.md", "").replace(".md", "/");
        finalUrl = urljoin(baseURL, itemUrlStripped);
    }

    // console.debug(itemUrlStripped);
    let anchorClasses = "";
    let ulClass = "list pl2";
    var liClass = "inactive";  // list-group-item-* is a bootstrap class.
    if (pageUrl.replace(basePath, "/") == itemUrlStripped) {
        liClass = "active underline";
    }
    // console.debug(sidebarItem);
    if(sidebarItem.hasOwnProperty("contents")) {
        var contentHtml = "";
        var title = sidebarItem.title || pageUrlToParams.get(itemUrlStripped).title;
        // If the listId included devanAgarI characters, collapsing and uncollapsing would not work for some unknown reason. So, we use random numbers as ids.
        var listId = `${parentListId}_${Math.floor(Math.random()*10000)}`;
        for(let subitem of sidebarItem.contents) {
            contentHtml = `${contentHtml}\n ${getSidebarItemHtml(subitem, listId)}`;
        }
        // console.debug(title, itemUrlStripped);
        var itemTitleHtml;
        if (itemUrlStripped != "#") {
            itemTitleHtml  = `<a href="${finalUrl}" class="${anchorClasses}"> ${title}</a>`;
        } else {
            itemTitleHtml  = `<a data-toggle="collapse" href="#${listId}" role="button" aria-expanded="false" aria-controls="${listId}"  class="${anchorClasses}"> ${title}</a>`;
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
    if (!sidebarItem.url) {
        console.error("Strange sidebarItem with no url or contents fields!", sidebarItem);
        return "";
    }
    if (sidebarItem.url.startsWith("dir://")) {
        var itemHtml = "";
        var dirUrl = sidebarItem.url.replace("dir://", "/");
        if (!dirUrl.endsWith("/")) {
            dirUrl = dirUrl + "/";
        }
        if (dirUrl in pageDirectoryToUrl) {
            // console.debug(dirUrl);
            // Note that only pages parsed and generated by jekyll are processed below - not ready files like pdf-s and htmls.
            for (let contentUrl of pageDirectoryToUrl[dirUrl]) {
                var subitem = {"url": contentUrl};
                itemHtml = `${itemHtml}\n ${getSidebarItemHtml(subitem)}`;
            }
        } else {
            console.error(`No such directory ${dirUrl}`);
        }
        return itemHtml;
    }
    
    // Finally, the default case.
    // console.debug(baseURL +itemUrlStripped);
    var title = sidebarItem.title;
    if (!title) {
        if (pageUrlToParams.has(itemUrlStripped)) {
            var title = sidebarItem.title || pageUrlToParams.get(itemUrlStripped).title;
        } else {
            console.error(`${itemUrlStripped} not present in pageUrlToParams. Something is wrong with the sidebar definition. So can't figure out title.`, sidebarItem);
        }
    }
    var itemHtml = `<li class="${liClass}"><a href="${finalUrl }"  class="${anchorClasses}" target="">${title}</a></li>`;
    return itemHtml;
}

function insertSidebarItems() {
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

function insertNavItems(navbarId, items) {
    if (topnavId && !$(navbarId).attr("addedCustomItems")) {
        // console.debug(topnavDropdown);
        for (let item of items) {
            $(navbarId).append(getSidebarItemHtml(item));
        }
        $(navbarId).attr("addedCustomItems", "true");
    }
}

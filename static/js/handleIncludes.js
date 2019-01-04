
/*
Example: absoluteUrl("../subfolder1/divaspari.md", "images/forest-fire.jpg") == "../subfolder1/images/forest-fire.jpg"
 */
function absoluteUrl(base, relative) {
    // console.debug(base, relative);
    if (relative.startsWith("http") || relative.startsWith("file")) {
        return relative;
    }
    if (relative.startsWith("/") && !base.startsWith("http") && !base.startsWith("file")) {
        return relative;
    }
    var stack = base.toString().split("/"),
        parts = relative.split("/");
    stack.pop(); // remove current file name (or empty string)
                 // (omit if "base" is the current folder without trailing slash)
    for (var i=0; i<parts.length; i++) {
        if (parts[i] == ".")
            continue;
        if (parts[i] == "..")
            stack.pop();
        else
            stack.push(parts[i]);
    }
    return stack.join("/");
}

// WHen you include html from one page within another, you need to fix image urls, anchor urls etc..
function fixIncludedHtml(url, html, newLevelForH1) {
    // We want to use jquery to parse html, but without loading images. Hence this.
    // Tip from: https://stackoverflow.com/questions/15113910/jquery-parse-html-without-loading-images
    var virtualDocument = document.implementation.createHTMLDocument('virtual');
    var jqueryElement = $(html, virtualDocument);

    // console.debug(jqueryElement.html());
    // Remove some tags.
    jqueryElement.find("script").remove();
    jqueryElement.find("footer").remove();
    jqueryElement.find("#disqus_thread").remove();
    jqueryElement.find("#toc").remove();
    jqueryElement.find("#toc_header").remove();
    jqueryElement.find(".back-to-top").remove();
    // console.debug(jqueryElement.html());

    // Deal with includes within includes. Do this before fixing images urls etc.. because there may be images within the newly included html.
    jqueryElement.find('.js_include').each(function() {
        if (newLevelForH1 < 1) {
            console.error("Ignoring invalid newLevelForH1: %d, using 6", newLevelForH1);
            newLevelForH1 = 6;
        }
        var jsIncludeElement = $(this);
        var includedPageNewLevelForH2 = parseInt(jsIncludeJqueryElement.attr("newLevelForH1"));
        if (includedPageNewLevelForH2 == undefined) {
            includedPageNewLevelForH2 = 6;
        }
        includedPageNewLevelForH2 = Math.min(6, ((includedPageNewLevelForH2 - 2) + newLevelForH1));
        fillJsInclude($(this), includedPageNewLevelForH2);
    });

    /*
    Fix headers in the included html so as to not mess up the table of contents
    of the including page.
    Adjusting the heading levels to retain substructure seems more complicated -
    getting the heading "under" which jsIncludeJqueryElement falls seems non-trivial.
     */
    var headers = jqueryElement.find(":header");
    if (headers.length > 0) {
        var id_prefix = headers[0].id;
        headers.replaceWith(function() {
            var headerElement = $(this);
            // console.debug(headerElement);
            var hLevel = parseInt(headerElement.prop("tagName").substring(1));
            var hLevelNew = Math.min(6, newLevelForH1 - 1 + hLevel);
            var newId = id_prefix + "_" + headerElement[0].id;
            return $("<h" + hLevelNew +" id='" + newId + "'/>").append(headerElement.contents());
        });
    }

    // Fix image urls.
    jqueryElement.find("img").each(function() {
        // console.log(absoluteUrl(url, $(this).attr("src")));
        // console.log($(this).attr("src"))
        $(this).attr("src", absoluteUrl(url, $(this).attr("src")));
        // console.log($(this).attr("src"))
    });

    // Fix links.
    jqueryElement.find("a").each(function() {
        // console.debug($(this).html());
        var href = $(this).attr("href");
        if (href.startsWith("#")) {
            var headers = jqueryElement.find(":header");
            var new_href = href;
            if (headers.length > 0) {
                var id_prefix = headers[0].id;
                new_href = id_prefix + "_" + href.substr(1);
                // console.debug(new_href, id_prefix, href);
                jqueryElement.find(href).each(function () {
                    $(this).attr("id", new_href.substr(1));
                });
            }
            $(this).attr("href", new_href);
        } else {
            $(this).attr("href", absoluteUrl(url, href));
        }
    });

    return jqueryElement;
}

async function processAjaxResponseHtml(responseHtml, addTitle, includedPageNewLevelForH1, includedPageUrl) {
  // We want to use jquery to parse html, but without loading images. Hence this.
  // Tip from: https://stackoverflow.com/questions/15113910/jquery-parse-html-without-loading-images
  var virtualDocument = document.implementation.createHTMLDocument('virtual');

  var titleElements = $(responseHtml, virtualDocument).find("h1");
  var title = "";
  if (titleElements.length > 0) {
      // console.debug(titleElements[0]);
      title = titleElements[0].textContent;
  }

  var contentElements = $(responseHtml, virtualDocument).find("#post_content");
  // console.log(contentElements);
  if (contentElements.length == 0) {
      let message = "Could not get \"post-content\" class element.";
      console.warn(message);
      console.log(responseHtml);
      throw Error(message);
  } else {
      // We don't want multiple post-content divs, hence we replace with an included-post-content div.
      var elementToInclude = $("<div class='included-post-content border'/>")
      var editLinkElements = $(responseHtml, virtualDocument).find("#editLink");
      var editLinkHtml = "";
      if (editLinkElements.length > 0) {
        // console.debug(editLinkElements);
        editLinkHtml = `<a class="btn btn-secondary" href="${editLinkElements.attr("href")}"><i class="fas fa-edit"></i></a>`
      }
      var titleHtml = "";
      if (addTitle) {
          titleHtml = "<div class='border d-flex justify-content-between'>" +
          "<h1 id='" + title + "'>" + title + "</h1>" +
          "<div><a class='btn btn-secondary' href='" + absoluteUrl(document.location, includedPageUrl) + "'><i class=\"fas fa-external-link-square-alt\"></i></a>" +
          editLinkHtml + "</div>" +
          "</div>";
      }
      var contentHtml = `<div class=''>${contentElements[0].innerHTML}</div>`;
      elementToInclude.html(titleHtml + contentHtml);
      var contentElement = fixIncludedHtml(includedPageUrl, elementToInclude, includedPageNewLevelForH1);
      return contentElement;
  }
}

function fillJsInclude(jsIncludeJqueryElement, includedPageNewLevelForH1) {
    var includedPageUrl = "../" + jsIncludeJqueryElement.attr("url").replace(".md", "/").toLowerCase();
    if (includedPageNewLevelForH1 == undefined) {
        includedPageNewLevelForH1 = parseInt(jsIncludeJqueryElement.attr("newLevelForH1"));
    }
    if (includedPageNewLevelForH1 == undefined) {
        includedPageNewLevelForH1 = 6;
    }
    let getAjaxResponsePromise = $.ajax(includedPageUrl);
    function processingFn(responseHtml) {
      return processAjaxResponseHtml(responseHtml, jsIncludeJqueryElement.attr("includeTitle"), includedPageNewLevelForH1, includedPageUrl);
    }
    getAjaxResponsePromise.then(processingFn).then(function(contentElement) {
      // console.log(contentElement);
      jsIncludeJqueryElement.html(contentElement);
      // TODO: The following calls lead to major UI delays and problems on pages such as saMskAra/mantra/sangrahah/paravastu-saama/udakashanti/#. Must use worker instead.
      fillAudioEmbeds();
      fillVideoEmbeds();
      updateToc();
    }).catch(function(error){
        var titleHtml = "";
        var title = "Missing page.";
        if (jsIncludeJqueryElement.attr("includeTitle")) {
            titleHtml = "<h1 id='" + title + "'>" + title + "</h1>";
        }
        jsIncludeJqueryElement.html(titleHtml + "Could not get: " + includedPageUrl + " See debug messages in console for details.");
        console.debug(error);
    });
}

// Process includes of the form:
// <div class="js_include" url="index.md"/>
// can't easily use a worker - workers cannot access DOM (workaround: pass strings back and forth), cannot access jquery library.
$( document ).ready(function() {
    $('.js_include').each(function() {
        console.debug("Inserting include for " + $(this).html());
        var jsIncludeJqueryElement = $(this);
        // The actual filling happens in a separate thread!
        fillJsInclude(jsIncludeJqueryElement);
    });
});

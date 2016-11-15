(function() {
  var indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  (function(global, factory) {
    if (typeof exports === 'object' && typeof module !== 'undefined') {
      factory(exports);
    } else if (typeof define === 'function' && define.amd) {
      define(['exports'], factory);
    } else {
      factory(global.EvernoteHelper = global.EvernoteHelper || {});
    }
  })(this, function(exports) {
    var cheerio, convertHexNCR2String, htmlDecode, literalReplace, stripEmptyLines;
    exports.test = 5;
    cheerio = null;
    stripEmptyLines = function(inputStr) {
      var l, len, line, lines, outputStr;
      lines = inputStr.split(/[\n\r]/);
      outputStr = "";
      for (l = 0, len = lines.length; l < len; l++) {
        line = lines[l];
        if (line.trim() === "") {
          continue;
        }
        outputStr += line + "\n";
      }
      return outputStr;
    };
    htmlDecode = function(encodedHTML) {
      var restoredHTML;
      restoredHTML = encodedHTML.replace(/&gt;/g, '>').replace(/&lt;/g, '<');
      restoredHTML = restoredHTML.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
      restoredHTML = restoredHTML.replace(/&apos;/g, "'");
      return restoredHTML;
    };
    literalReplace = function(inputStr, oldSubStr, newSubStr, options) {
      var i, lookAhead, lookBack, negatedLookAhead, negatedLookBack, newSubStrLength, oldSubStrLength, outputStr, replaceOnce, skip, startIndex, validReplacements;
      if (!((inputStr != null) && (oldSubStr != null))) {
        return inputStr;
      }
      replaceOnce = options != null ? options.replaceOnce : void 0;
      if (replaceOnce == null) {
        replaceOnce = false;
      }
      lookAhead = options != null ? options.lookAhead : void 0;
      negatedLookAhead = options != null ? options.negatedLookAhead : void 0;
      if (negatedLookAhead == null) {
        negatedLookAhead = false;
      }
      lookBack = options != null ? options.lookBack : void 0;
      negatedLookBack = options != null ? options.negatedLookBack : void 0;
      if (negatedLookBack == null) {
        negatedLookBack = false;
      }
      startIndex = inputStr.indexOf(oldSubStr);
      oldSubStrLength = oldSubStr.length;
      newSubStrLength = newSubStr.length;
      outputStr = inputStr;
      i = 0;
      validReplacements = 0;
      while (startIndex > -1 && startIndex < outputStr.length) {
        if (validReplacements > 0 && replaceOnce) {
          return outputStr;
        }
        if (i > 500) {
          return outputStr;
        }
        skip = false;
        if ((lookBack != null) && startIndex >= lookBack.length) {
          if (outputStr.slice(startIndex - lookBack.length, startIndex) === lookBack && negatedLookBack) {
            startIndex = outputStr.indexOf(oldSubStr, startIndex + oldSubStrLength + 1);
            skip = true;
          } else if (!negatedLookBack) {
            startIndex = outputStr.indexOf(oldSubStr, startIndex + oldSubStrLength + 1);
            skip = true;
          }
        } else if ((lookAhead != null) && outputStr.length >= (startIndex + oldSubStrLength + lookAhead.length)) {
          if (outputStr.slice(startIndex + oldSubStrLength, startIndex + oldSubStrLength + lookAhead.length) === lookAhead && negatedLookAhead) {
            startIndex = outputStr.indexOf(oldSubStr, startIndex + oldSubStrLength + lookAhead.length);
            skip = true;
          } else if (!negatedLookAhead) {
            startIndex = outputStr.indexOf(oldSubStr, startIndex + oldSubStrLength + lookAhead.length);
            skip = true;
          }
        }
        if (!skip) {
          outputStr = outputStr.slice(0, startIndex) + newSubStr + outputStr.slice(startIndex + oldSubStrLength, outputStr.length);
          startIndex = outputStr.indexOf(oldSubStr, startIndex + newSubStrLength);
          validReplacements += 1;
        }
        i += 1;
      }
      return outputStr;
    };
    convertHexNCR2String = function(inputStr) {
      var hexNCRTestReg, matched, startIndex, tmpString;
      hexNCRTestReg = /([^`]\s*?)&#x([a-zA-Z0-9]+?);/i;
      startIndex = 0;
      while (startIndex < inputStr.length && hexNCRTestReg.test(inputStr.slice(startIndex, inputStr.length))) {
        matched = hexNCRTestReg.exec(inputStr.slice(startIndex, inputStr.length));
        if (matched == null) {
          return inputStr;
        }
        tmpString = String.fromCharCode(parseInt('0x' + matched[2]));
        inputStr = inputStr.slice(0, startIndex + matched.index) + matched[1] + tmpString + inputStr.slice(startIndex + matched.index + matched[0].length, inputStr.length);
        startIndex += matched.index + matched[1].length + tmpString.length - 2;
      }
      return inputStr;
    };
    exports.prepareHtml = function(html) {
      var div, doctype, l, len, newHtml, o, ref, ref1;
      if (cheerio == null) {
        cheerio = require('cheerio');
      }
      o = cheerio.load(html);
      ref = o('.table-of-contents');
      for (l = 0, len = ref.length; l < len; l++) {
        div = ref[l];
        o(div).attr("title", "table-of-contents");
      }
      doctype = '<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">';
      newHtml = doctype + ((ref1 = o.html()) != null ? ref1.replace(/nobreakspace/g, '&nbsp;') : void 0);
      return newHtml;
    };
    exports.markdownCleanUp = function(markdown) {
      var consecutiveEmptyLine, endOfBlockToWrap, i, insideBlockToWrap, k, l, lastBlockType, line, lineBreak, mdDict, mdDict1, mdDict2, mlines, newMarkdown, ref, startOfBlockToWrap, unindented, v, wasInsideBlockToWrap;
      mdDict = {
        blockquote: /^\s*>/i,
        codeblock: /^s{4,}|\t/i,
        list: /^\s{0,3}(?:\-|\*|\+)\s+/i,
        numList: /^\s{0,3}\d*\.\s+/i
      };
      mdDict1 = {
        toc: /^\s*\{\!toc\}\s*$/i
      };
      mdDict2 = {
        codeblock1: /^`{3}\S*?\s*$/i
      };
      unindented = /^\s{0,3}\S+/i;
      lineBreak = "";
      mlines = markdown.toString().split(/[\n\r]/);
      consecutiveEmptyLine = false;
      wasInsideBlockToWrap = false;
      startOfBlockToWrap = -1;
      endOfBlockToWrap = -1;
      lastBlockType = "";
      newMarkdown = "";
      for (i = l = 0, ref = mlines.length - 1; 0 <= ref ? l <= ref : l >= ref; i = 0 <= ref ? ++l : --l) {
        line = mlines[i];
        if (consecutiveEmptyLine && line.trim().length === 0) {
          continue;
        }
        consecutiveEmptyLine = line.trim().length === 0 ? true : false;
        insideBlockToWrap = false;
        for (k in mdDict2) {
          v = mdDict2[k];
          if (v.test(line)) {
            if (lastBlockType === "") {
              startOfBlockToWrap = i;
              lastBlockType = k;
              insideBlockToWrap = true;
            } else {
              endOfBlockToWrap = i;
              lastBlockType = "";
              insideBlockToWrap = true;
            }
            break;
          }
        }
        if ((!insideBlockToWrap) && (lastBlockType in mdDict2)) {
          insideBlockToWrap = true;
        }
        if (!insideBlockToWrap) {
          for (k in mdDict) {
            v = mdDict[k];
            if (v.test(line)) {
              if (k === lastBlockType) {
                insideBlockToWrap = true;
              } else if (lastBlockType !== "") {
                insideBlockToWrap = true;
                endOfBlockToWrap = i - 1;
                startOfBlockToWrap = i;
              } else {
                insideBlockToWrap = true;
                startOfBlockToWrap = i;
              }
              lastBlockType = k;
              break;
            }
          }
          if ((!insideBlockToWrap) && wasInsideBlockToWrap) {
            if (breakOnSingleNewLine) {
              endOfBlockToWrap = i - 1;
              lastBlockType = "";
            } else if (!unindented.test(line)) {
              insideBlockToWrap = true;
            } else {
              endOfBlockToWrap = i - 1;
              lastBlockType = "";
              insideBlockToWrap = false;
            }
          }
        }
        if (!insideBlockToWrap) {
          for (k in mdDict1) {
            v = mdDict1[k];
            if (v.test(line)) {
              insideBlockToWrap = true;
            }
          }
        }
        if (insideBlockToWrap && !wasInsideBlockToWrap && startOfBlockToWrap === i) {
          newMarkdown += "" + lineBreak + line + "\n";
        } else if ((!insideBlockToWrap) && wasInsideBlockToWrap && endOfBlockToWrap === (i - 1)) {
          newMarkdown += line + "\n" + lineBreak;
        } else if ((startOfBlockToWrap === i) && (endOfBlockToWrap === (i - 1))) {
          newMarkdown += "" + lineBreak + lineBreak + line + "\n";
        } else {
          newMarkdown += line + "\n";
        }
        wasInsideBlockToWrap = insideBlockToWrap;
      }
      return newMarkdown;
    };
    exports.toMarkdown = function(html, options) {
      var div, ebd, img, l, len, len1, len2, len3, len4, len5, len6, len7, len8, m, markdownText, n, o, p, paragraph, parseBlockquote, parseCode, parseCodeBlock, parseCodeInline, parseDel, parseDiv, parseElm, parseEmbed, parseEmphasis, parseFootnoteDiv, parseHR, parseHeaders, parseImage, parseInlineMath, parseInput, parseKBD, parseLabel, parseLineBreak, parseLink, parseListItem, parseMath, parseObject, parseOrderedList, parseParagraph, parsePre, parseSpan, parseStrong, parseSup, parseTable, parseTableBody, parseTableCell, parseTableHead, parseTableRow, parseUnderscore, parseUnknownElement, parseUnorderedList, q, r, ref, ref1, ref2, ref3, ref4, ref5, ref6, ref7, ref8, refDef, refStyle, refs, replaceOptions, rootElms, s, scrpt, sp, t, u, ul, w;
      if (options == null) {
        options = {};
      }
      options.codeInline = true;
      options.inCodeBlock = false;
      if (cheerio == null) {
        cheerio = require('cheerio');
      }
      o = cheerio.load(html);
      refStyle = (ref = options.refStyle) != null ? ref : false;
      if (refStyle) {
        refs = [];
      }
      parseHeaders = (function(_this) {
        return function(oheader, options) {
          var breakOnSingleNewLine, headerChildElm, headerChildElmText, headerHTML, headerLevel, headerSymbol, headerText, i, l, len, line, m, preChar, ref1, ref2, ref3, ref4, ref5, ref6, ref7, style, tagName;
          if ((oheader != null ? (ref1 = oheader.tagName) != null ? (ref2 = ref1.slice(0, 1)) != null ? ref2.toLowerCase() : void 0 : void 0 : void 0) !== 'h') {
            return o.html(oheader);
          }
          breakOnSingleNewLine = (ref3 = options.breakOnSingleNewLine) != null ? ref3 : false;
          preChar = (ref4 = options.preChar) != null ? ref4 : "";
          style = (ref5 = options.style) != null ? ref5 : "#";
          headerHTML = o(oheader).html();
          headerText = headerHTML;
          ref6 = o(oheader).children();
          for (l = 0, len = ref6.length; l < len; l++) {
            headerChildElm = ref6[l];
            headerChildElmText = parseElm(headerChildElm, options);
            headerText = literalReplace(headerText, o.html(headerChildElm), headerChildElmText, replaceOptions);
          }
          headerText = htmlDecode(headerText).replace(/\n/g, ' ');
          tagName = oheader.tagName;
          headerLevel = parseInt(tagName.slice(1, tagName.length));
          headerSymbol = "";
          if (headerLevel > 2 || style === "#") {
            for (i = m = 0, ref7 = headerLevel - 1; 0 <= ref7 ? m <= ref7 : m >= ref7; i = 0 <= ref7 ? ++m : --m) {
              headerSymbol += "#";
            }
            line = "\n" + preChar + headerSymbol + " " + headerText + "   \n";
          } else {
            headerSymbol = headerLevel === 1 ? "==========" : "----------";
            line = "\n" + preChar + headerText + "\n" + preChar + headerSymbol + "   \n";
          }
          if (!breakOnSingleNewLine) {
            line += "\n";
          }
          return line;
        };
      })(this);
      parseParagraph = (function(_this) {
        return function(opar, options) {
          var breakOnSingleNewLine, k, l, len, newOptions, oparElm, oparElmText, parHTML, parText, preChar, ref1, ref2, ref3, ref4, regTmp, v;
          if ((opar != null ? (ref1 = opar.tagName) != null ? ref1.toLowerCase() : void 0 : void 0) !== 'p') {
            return o.html(opar);
          }
          breakOnSingleNewLine = (ref2 = options.breakOnSingleNewLine) != null ? ref2 : false;
          preChar = (ref3 = options.preChar) != null ? ref3 : "";
          parHTML = o(opar).html();
          parText = parHTML;
          newOptions = {};
          for (k in options) {
            v = options[k];
            newOptions[k] = v;
          }
          newOptions.sameParagraph = true;
          ref4 = o(opar).children();
          for (l = 0, len = ref4.length; l < len; l++) {
            oparElm = ref4[l];
            oparElmText = parseElm(oparElm, newOptions);
            parText = literalReplace(parText, o.html(oparElm), oparElmText, replaceOptions);
          }
          if (breakOnSingleNewLine) {
            parText += "\n";
          } else {
            parText += "\n\n";
          }
          regTmp = new RegExp("\n(?!(?:" + (preChar.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) + "))", "g");
          parText = preChar + parText.replace(regTmp, "\n" + preChar);
          parText = htmlDecode(parText);
          return parText;
        };
      })(this);
      parseLineBreak = (function(_this) {
        return function(obr, options) {
          var brText, breakOnSingleNewLine, preChar, ref1, ref2, ref3, ref4, sameParagraph;
          if ((obr != null ? (ref1 = obr.tagName) != null ? ref1.toLowerCase() : void 0 : void 0) !== 'br') {
            return o.html(obr);
          }
          preChar = (ref2 = options.preChar) != null ? ref2 : "";
          sameParagraph = (ref3 = options.sameParagraph) != null ? ref3 : false;
          breakOnSingleNewLine = (ref4 = options.breakOnSingleNewLine) != null ? ref4 : false;
          if (breakOnSingleNewLine) {
            brText = "";
          } else {
            brText = "    ";
          }
          if (!sameParagraph) {
            brText += "\n" + preChar;
          }
          return brText;
        };
      })(this);
      parseUnderscore = (function(_this) {
        return function(ouds, options) {
          return o.html(ouds);
        };
      })(this);
      parseStrong = (function(_this) {
        return function(ostrong, options) {
          var elm, elmText, l, len, ref1, ref2, ref3, ref4, strongHTML, strongStyle, strongText;
          if ((ref1 = ostrong != null ? (ref2 = ostrong.tagName) != null ? ref2.toLowerCase() : void 0 : void 0) !== 'strong' && ref1 !== 'b') {
            return o.html(ostrong);
          }
          strongStyle = (ref3 = options.strongStyle) != null ? ref3 : "**";
          strongHTML = o(ostrong).html();
          strongText = strongHTML;
          ref4 = o(ostrong).children();
          for (l = 0, len = ref4.length; l < len; l++) {
            elm = ref4[l];
            elmText = parseElm(elm, options);
            strongText = literalReplace(strongText, o.html(elm), elmText);
          }
          return "" + strongStyle + strongText + strongStyle;
        };
      })(this);
      parseEmphasis = (function(_this) {
        return function(oemph, options) {
          var elm, elmText, emphHTML, emphText, emphasisStyle, l, len, ref1, ref2, ref3, ref4;
          if ((ref1 = oemph != null ? (ref2 = oemph.tagName) != null ? ref2.toLowerCase() : void 0 : void 0) !== 'i' && ref1 !== 'em') {
            return o.html(oemph);
          }
          emphasisStyle = (ref3 = options.emphasisStyle) != null ? ref3 : "_";
          emphHTML = o(oemph).html();
          emphText = emphHTML;
          ref4 = o(oemph).children();
          for (l = 0, len = ref4.length; l < len; l++) {
            elm = ref4[l];
            elmText = parseElm(elm, options);
            emphText = literalReplace(emphText, o.html(elm), elmText, replaceOptions);
          }
          return "" + emphasisStyle + emphText + emphasisStyle;
        };
      })(this);
      parseDel = (function(_this) {
        return function(odel, options) {
          var delHTML, delStyle, delText, elm, elmText, l, len, ref1, ref2, ref3;
          if ((odel != null ? (ref1 = odel.tagName) != null ? ref1.toLowerCase() : void 0 : void 0) !== 'del') {
            return o.html(odel);
          }
          delStyle = (ref2 = options.delStyle) != null ? ref2 : "~~";
          delHTML = o(odel).html();
          delText = delHTML;
          ref3 = o(odel).children();
          for (l = 0, len = ref3.length; l < len; l++) {
            elm = ref3[l];
            elmText = parseElm(elm, options);
            delText = literalReplace(delText, o.html(elm), elmText, replaceOptions);
          }
          return "" + delStyle + delText + delStyle;
        };
      })(this);
      parseKBD = (function(_this) {
        return function(okbd, options) {
          return "<kbd>" + (o(okbd).html()) + "</kbd>";
        };
      })(this);
      parseCode = (function(_this) {
        return function(ocode, options) {
          var codeInline, codeMarkdown, ref1, ref2;
          if ((ocode != null ? (ref1 = ocode.tagName) != null ? ref1.toLowerCase() : void 0 : void 0) !== 'code') {
            return o.html(ocode);
          }
          codeInline = (ref2 = options.codeInline) != null ? ref2 : true;
          if (codeInline) {
            codeMarkdown = parseCodeInline(ocode, options);
          } else {
            codeMarkdown = parseCodeBlock(ocode, options);
          }
          return codeMarkdown;
        };
      })(this);
      parseCodeInline = (function(_this) {
        return function(ocode, options) {
          var codeMarkdown, codeText, ref1;
          if ((ocode != null ? (ref1 = ocode.tagName) != null ? ref1.toLowerCase() : void 0 : void 0) !== 'code') {
            return o.html(ocode);
          }
          codeText = htmlDecode(o(ocode).text());
          codeText = literalReplace(codeText, '\\$', '\\\\$');
          if (codeText.indexOf('`') > -1) {
            codeMarkdown = "``" + codeText + "``";
          } else {
            codeMarkdown = "`" + codeText + "`";
          }
          return codeMarkdown;
        };
      })(this);
      parseCodeBlock = (function(_this) {
        return function(ocode, options) {
          var codeBlockStyle, codeLine, codeText, l, len, rawCodeLines, rawCodeText, ref1, ref2, ref3, ref4;
          if ((ref1 = ocode != null ? (ref2 = ocode.tagName) != null ? ref2.toLowerCase() : void 0 : void 0) !== 'code') {
            return o.html(ocode);
          }
          if (((ref3 = o(ocode).parent().tagName) != null ? ref3.toLowerCase() : void 0) !== 'pre') {
            return o.html(ocode);
          }
          codeBlockStyle = (ref4 = options.codeBlockStyle) != null ? ref4 : '    ';
          rawCodeText = o(ocode).text();
          rawCodeLines = rawCodeText.split(/[\n\r]/);
          codeText = "";
          for (l = 0, len = rawCodeLines.length; l < len; l++) {
            codeLine = rawCodeLines[l];
            codeText += codeBlockStyle + codeLine + "\n";
          }
          codeText = htmlDecode(codeText);
          codeText = literalReplace(codeText, '\\$', '\\\\$');
          return codeText;
        };
      })(this);
      parseListItem = (function(_this) {
        return function(oli, options) {
          var l, len, listItemElm, listItemElmText, listItemHTML, listItemText, ref1, ref2;
          if ((oli != null ? (ref1 = oli.tagName) != null ? ref1.toLowerCase() : void 0 : void 0) !== 'li') {
            return o.html(oli);
          }
          listItemHTML = o(oli).html();
          listItemText = listItemHTML;
          ref2 = o(oli).children();
          for (l = 0, len = ref2.length; l < len; l++) {
            listItemElm = ref2[l];
            listItemElmText = parseElm(listItemElm, options);
            listItemText = literalReplace(listItemText, o.html(listItemElm), listItemElmText, replaceOptions);
          }
          return listItemText;
        };
      })(this);
      parseUnorderedList = (function(_this) {
        return function(olist, options) {
          var breakOnSingleNewLine, indentStyle, k, l, len, listItem, listItemText, listStyle, listText, newOptions, preChar, ref1, ref2, ref3, ref4, ref5, ref6, v;
          if ((olist != null ? (ref1 = olist.tagName) != null ? ref1.toLowerCase() : void 0 : void 0) !== 'ul') {
            return o.html(olist);
          }
          breakOnSingleNewLine = (ref2 = options.breakOnSingleNewLine) != null ? ref2 : false;
          preChar = (ref3 = options.preChar) != null ? ref3 : "";
          listStyle = (ref4 = options.listStyle) != null ? ref4 : '-   ';
          indentStyle = (ref5 = options.indentStyle) != null ? ref5 : '    ';
          newOptions = {};
          for (k in options) {
            v = options[k];
            newOptions[k] = v;
          }
          newOptions.preChar = preChar + indentStyle;
          listText = "";
          ref6 = o(olist).children('li');
          for (l = 0, len = ref6.length; l < len; l++) {
            listItem = ref6[l];
            listItemText = parseListItem(listItem, newOptions);
            listText += preChar + listStyle + listItemText + "\n";
          }
          if (breakOnSingleNewLine) {
            listText += "\n";
          } else {
            listText += "\n\n";
          }
          return listText;
        };
      })(this);
      parseOrderedList = (function(_this) {
        return function(olist, options) {
          var breakOnSingleNewLine, i, indentStyle, k, l, len, listItem, listItemText, listStyle, listText, newOptions, preChar, ref1, ref2, ref3, ref4, ref5, v;
          if ((olist != null ? (ref1 = olist.tagName) != null ? ref1.toLowerCase() : void 0 : void 0) !== 'ol') {
            return o.html(olist);
          }
          breakOnSingleNewLine = (ref2 = options.breakOnSingleNewLine) != null ? ref2 : false;
          preChar = (ref3 = options.preChar) != null ? ref3 : "";
          indentStyle = (ref4 = options.indentStyle) != null ? ref4 : '    ';
          newOptions = {};
          for (k in options) {
            v = options[k];
            newOptions[k] = v;
          }
          newOptions.preChar = preChar + indentStyle;
          listText = "";
          i = 1;
          ref5 = o(olist).children('li');
          for (l = 0, len = ref5.length; l < len; l++) {
            listItem = ref5[l];
            listItemText = parseListItem(listItem, newOptions);
            listStyle = (i.toString()) + ".   ";
            i += 1;
            listText += preChar + listStyle + listItemText + "\n";
          }
          if (breakOnSingleNewLine) {
            listText += "\n";
          } else {
            listText += "\n\n";
          }
          return listText;
        };
      })(this);
      parseImage = (function(_this) {
        return function(oimg, options) {
          var altText, checked, id, imgSRC, imgText, objText, optTitle, ref1, ref2, ref3, ref4, ref5, refDef, todo;
          if ((oimg != null ? (ref1 = oimg.tagName) != null ? ref1.toLowerCase() : void 0 : void 0) !== 'img') {
            return o.html(oimg);
          }
          refStyle = (ref2 = options.refStyle) != null ? ref2 : false;
          altText = o(oimg).attr("alt");
          imgSRC = o(oimg).attr("src");
          optTitle = (ref3 = o(oimg).attr("title")) != null ? ref3 : "Optional title";
          todo = ((ref4 = o(oimg).attr("class")) != null ? ref4.indexOf('en-todo') : void 0) > -1;
          if (todo) {
            checked = ((ref5 = o(oimg).attr("class")) != null ? ref5.indexOf("en-todo-checked") : void 0) > -1;
            objText = checked ? "[x]" : "[ ]";
            objText += " " + o(oimg).html();
            return objText;
          }
          if (refStyle) {
            id = ((refs != null ? refs.length : void 0) + 1).toString();
            refDef = "[" + id + "]: " + imgSRC + " \"" + optTitle + "\"";
            imgText = "![" + altText + "][" + id + "]";
            refs.push(refDef);
          } else {
            imgText = "![" + altText + "](" + imgSRC + " \"" + optTitle + "\")";
          }
          return imgText;
        };
      })(this);
      parseEmbed = (function(_this) {
        return function(oebd, options) {
          var altText, ebdSRC, ebdText, id, optTitle, ref1, ref2, ref3, refDef;
          if ((oebd != null ? (ref1 = oebd.tagName) != null ? ref1.toLowerCase() : void 0 : void 0) !== 'embed') {
            return o.html(oebd);
          }
          refStyle = (ref2 = options.refStyle) != null ? ref2 : false;
          altText = o(oebd).attr("alt");
          ebdSRC = o(oebd).attr("src");
          optTitle = (ref3 = o(oebd).attr("title")) != null ? ref3 : "Optional title";
          if (refStyle) {
            id = ((refs != null ? refs.length : void 0) + 1).toString();
            refDef = "[" + id + "]: " + ebdSRC + " \"" + optTitle + "\"";
            ebdText = "!{" + altText + "}[" + id + "]";
            refs.push(refDef);
          } else {
            ebdText = "!{" + altText + "}(" + ebdSRC + " \"" + optTitle + "\")";
          }
          return ebdText;
        };
      })(this);
      parseLink = (function(_this) {
        return function(olink, options) {
          var href, id, linkMarkdown, linkText, optTitle, ref1, ref2, refDef;
          if ((olink != null ? (ref1 = olink.tagName) != null ? ref1.toLowerCase() : void 0 : void 0) !== 'a') {
            return o.html(olink);
          }
          refStyle = (ref2 = options.refStyle) != null ? ref2 : false;
          linkText = o(olink).text();
          href = o(olink).attr("href");
          if (!((href != null ? href.length : void 0) > 0)) {
            return linkText;
          }
          optTitle = o(olink).attr("title");
          optTitle = optTitle != null ? " \"" + optTitle + "\"" : "";
          if (refStyle) {
            id = ((refs != null ? refs.length : void 0) + 1).toString();
            refDef = "[" + id + "]: " + href + " " + optTitle;
            linkMarkdown = "![" + linkText + "][" + id + "]";
            refs.push(refDef);
          } else if (linkText === href) {
            linkMarkdown = href;
          } else {
            linkMarkdown = "[" + linkText + "](" + href + " " + optTitle + ")";
          }
          return linkMarkdown;
        };
      })(this);
      parseHR = (function(_this) {
        return function(ohr, options) {
          var breakOnSingleNewLine, hrMarkdown, hrStyle, preChar, ref1, ref2, ref3, ref4;
          if ((ohr != null ? (ref1 = ohr.tagName) != null ? ref1.toLowerCase() : void 0 : void 0) !== 'hr') {
            return o.html(ohr);
          }
          breakOnSingleNewLine = (ref2 = options.breakOnSingleNewLine) != null ? ref2 : false;
          preChar = (ref3 = options.preChar) != null ? ref3 : "";
          hrStyle = (ref4 = options.hrStyle) != null ? ref4 : '--------------';
          if (breakOnSingleNewLine) {
            hrMarkdown = preChar + hrStyle + "\n";
          } else {
            hrMarkdown = preChar + hrStyle + "\n\n";
          }
          return hrMarkdown;
        };
      })(this);
      parseBlockquote = (function(_this) {
        return function(oblock, options) {
          var blockHTML, blockText, blockquoteStyle, breakOnSingleNewLine, elm, elmText, k, l, len, newOptions, preChar, ref1, ref2, ref3, ref4, ref5, v;
          if ((oblock != null ? (ref1 = oblock.tagName) != null ? ref1.toLowerCase() : void 0 : void 0) !== 'blockquote') {
            return o.html(oblock);
          }
          blockquoteStyle = (ref2 = options.blockquoteStyle) != null ? ref2 : "> ";
          preChar = (ref3 = options.preChar) != null ? ref3 : "";
          breakOnSingleNewLine = (ref4 = options.breakOnSingleNewLine) != null ? ref4 : false;
          newOptions = {};
          for (k in options) {
            v = options[k];
            newOptions[k] = v;
          }
          newOptions.preChar = preChar + blockquoteStyle;
          blockHTML = o(oblock).html();
          blockText = blockHTML;
          ref5 = o(oblock).children();
          for (l = 0, len = ref5.length; l < len; l++) {
            elm = ref5[l];
            elmText = parseElm(elm, newOptions);
            blockText = literalReplace(blockText, o.html(elm), elmText);
          }
          if (breakOnSingleNewLine) {
            blockText += "\n";
          } else {
            blockText += "\n\n";
          }
          blockText = htmlDecode(blockText);
          return blockText;
        };
      })(this);
      parseLabel = (function(_this) {
        return function(olabel, options) {
          var elm, elmText, l, labelHTML, labelText, len, ref1, ref2;
          if ((olabel != null ? (ref1 = olabel.tagName) != null ? ref1.toLowerCase() : void 0 : void 0) !== 'label') {
            return o.html(olabel);
          }
          labelHTML = o(olabel).html();
          labelText = labelHTML;
          ref2 = o(olabel).children();
          for (l = 0, len = ref2.length; l < len; l++) {
            elm = ref2[l];
            elmText = parseElm(elm, options);
            labelText = literalReplace(labelText, o.html(elm), elmText, replaceOptions);
          }
          labelText = htmlDecode(labelText);
          return labelText;
        };
      })(this);
      parseObject = (function(_this) {
        return function(obj, options) {
          var checked, elm, elmText, l, len, objText, ref1, ref2, ref3, ref4;
          if ((obj != null ? (ref1 = obj.tagName) != null ? ref1.toLowerCase() : void 0 : void 0) !== 'object') {
            return o.html(obj);
          }
          if (!(((ref2 = o(obj).attr("class")) != null ? ref2.indexOf('en-todo') : void 0) > -1)) {
            return parseUnknownElement(obj, options);
          }
          checked = ((ref3 = o(obj).attr("class")) != null ? ref3.indexOf("en-todo-checked") : void 0) > -1;
          objText = checked ? "[x]" : "[ ]";
          objText += " " + o(obj).html();
          ref4 = o(obj).children();
          for (l = 0, len = ref4.length; l < len; l++) {
            elm = ref4[l];
            elmText = parseElm(elm, options);
            objText = literalReplace(objText, o.html(elm), elmText, replaceOptions);
          }
          return objText;
        };
      })(this);
      parseInput = (function(_this) {
        return function(inp, options) {
          var checked, inputText, ref1, ref2;
          if ((inp != null ? (ref1 = inp.tagName) != null ? ref1.toLowerCase() : void 0 : void 0) !== 'input') {
            return o.html(inp);
          }
          if (o(inp).attr("type") !== 'checkbox') {
            return parseUnknownElement(inp, options);
          }
          checked = ((ref2 = o(inp).attr("class")) != null ? ref2.indexOf("en-todo-checked") : void 0) > -1;
          inputText = checked ? "[x]" : "[ ]";
          inputText += " " + o(inp).text();
          return inputText;
        };
      })(this);
      parseInlineMath = (function(_this) {
        return function(ospan, options) {
          var l, len, mathSpan, mathText, ref1, ref2, ref3, ref4;
          if ((ospan != null ? (ref1 = ospan.tagName) != null ? ref1.toLowerCase() : void 0 : void 0) !== 'span') {
            return o.html(ospan);
          }
          if (!(o(ospan).hasClass("math") || ((ref2 = o(ospan).attr("tooltip")) != null ? ref2.length : void 0) > 0)) {
            return o.html(ospan);
          }
          mathText = "";
          ref3 = o(ospan).find('span');
          for (l = 0, len = ref3.length; l < len; l++) {
            mathSpan = ref3[l];
            if ((ref4 = o(mathSpan).attr("title")) === "raw_mathjax_script") {
              mathText += htmlDecode(o(mathSpan).text());
            }
          }
          return mathText;
        };
      })(this);
      parseMath = (function(_this) {
        return function(ospan, options) {
          var l, len, mathSpan, mathText, ref1, ref2, ref3, ref4;
          if ((ospan != null ? (ref1 = ospan.tagName) != null ? ref1.toLowerCase() : void 0 : void 0) !== 'span') {
            return o.html(ospan);
          }
          if ((ref2 = o(ospan).attr("title")) !== "hidden_script_mathjax") {
            return o.html(ospan);
          }
          mathText = "\n";
          ref3 = o(ospan).find('span');
          for (l = 0, len = ref3.length; l < len; l++) {
            mathSpan = ref3[l];
            if ((ref4 = o(mathSpan).attr("title")) === "raw_mathjax_script") {
              mathText += htmlDecode(o(mathSpan).text());
            }
          }
          mathText += "\n";
          return mathText;
        };
      })(this);
      parseSpan = (function(_this) {
        return function(ospan, options) {
          var elm, elmText, l, len, markReg, ref1, ref2, ref3, ref4, spanStyle, spanText;
          if ((ospan != null ? (ref1 = ospan.tagName) != null ? ref1.toLowerCase() : void 0 : void 0) !== 'span') {
            return o.html(ospan);
          }
          if ((ref2 = o(ospan).attr("title")) === "hidden_script_mathjax") {
            return parseMath(ospan, options);
          }
          if (o(ospan).attr("title") === "MathJax_SVG" && o(ospan).children().length === 1 && o(ospan).children('img').length === 1) {
            return "";
          }
          if (o(ospan).hasClass("math") || ((ref3 = o(ospan).attr("tooltip")) != null ? ref3.length : void 0) > 0) {
            return parseInlineMath(ospan, options);
          }
          spanStyle = o(ospan).attr("style");
          markReg = /background\-color\:\s*yellow/i;
          if ((!options.inCodeBlock) && (spanStyle != null)) {
            if (markReg.test(spanStyle)) {
              spanText = "<mark>" + o(ospan).html() + "</mark>";
            } else {
              spanText = o.html(ospan);
            }
          } else {
            spanText = o(ospan).html();
          }
          ref4 = o(ospan).children();
          for (l = 0, len = ref4.length; l < len; l++) {
            elm = ref4[l];
            elmText = parseElm(elm, options);
            spanText = literalReplace(spanText, o.html(elm), elmText, replaceOptions);
          }
          spanText = htmlDecode(spanText);
          return "" + spanText;
        };
      })(this);
      parsePre = (function(_this) {
        return function(opre, options) {
          var breakOnSingleNewLine, elm, elmText, k, l, lang, len, newOptions, preHTML, preText, preTitle, preWrap, ref1, ref2, ref3, v;
          if ((opre != null ? (ref1 = opre.tagName) != null ? ref1.toLowerCase() : void 0 : void 0) !== 'pre') {
            return o.html(opre);
          }
          breakOnSingleNewLine = (ref2 = options.breakOnSingleNewLine) != null ? ref2 : false;
          newOptions = {};
          for (k in options) {
            v = options[k];
            newOptions[k] = v;
          }
          newOptions.codeInline = false;
          preTitle = o(opre).attr("title");
          if (preTitle && preTitle.indexOf("fenced-code-block") > -1) {
            lang = preTitle.slice(18, preTitle.length);
            preWrap = "```" + lang + "\n";
            newOptions.inCodeBlock = true;
          }
          preHTML = o(opre).html();
          preText = preHTML;
          ref3 = o(opre).children();
          for (l = 0, len = ref3.length; l < len; l++) {
            elm = ref3[l];
            elmText = parseElm(elm, newOptions);
            preText = literalReplace(preText, o.html(elm), elmText, replaceOptions);
          }
          preText += "\n";
          preText = htmlDecode(preText);
          if (preText.charAt(0) === '\n') {
            preText = preText.slice(1, preText.length);
          }
          if (preWrap != null) {
            preText = "" + preWrap + preText + "```";
          }
          if (!breakOnSingleNewLine) {
            preText += "\n";
          }
          return preText;
        };
      })(this);
      parseTableRow = (function(_this) {
        return function(otr, options) {
          var elmText, i, k, l, len, newOptions, ref1, ref2, ref3, ref4, tElm, tText, v;
          if ((otr != null ? (ref1 = otr.tagName) != null ? ref1.toLowerCase() : void 0 : void 0) !== 'tr') {
            return o.html(otr);
          }
          newOptions = {};
          for (k in options) {
            v = options[k];
            newOptions[k] = v;
          }
          i = 0;
          tText = o(otr).html();
          ref2 = o(otr).children();
          for (l = 0, len = ref2.length; l < len; l++) {
            tElm = ref2[l];
            newOptions.colCharCount = (ref3 = options.maxColCharCount) != null ? ref3[i] : void 0;
            newOptions.colAlign = (ref4 = options.colAlignments) != null ? ref4[i] : void 0;
            elmText = parseElm(tElm, newOptions);
            tText = literalReplace(tText, o.html(tElm), elmText, replaceOptions);
            i += 1;
          }
          tText = "|" + htmlDecode(tText).replace(/\n/g, '') + "\n";
          return tText;
        };
      })(this);
      parseTableBody = (function(_this) {
        return function(otbody, options) {
          var elm, elmText, l, len, ref1, ref2, tText;
          if ((otbody != null ? (ref1 = otbody.tagName) != null ? ref1.toLowerCase() : void 0 : void 0) !== 'tbody') {
            return o.html(otbody);
          }
          tText = o(otbody).html();
          ref2 = o(otbody).children();
          for (l = 0, len = ref2.length; l < len; l++) {
            elm = ref2[l];
            elmText = parseElm(elm, options);
            tText = literalReplace(tText, o.html(elm), elmText, replaceOptions);
          }
          tText = htmlDecode(tText);
          return tText;
        };
      })(this);
      parseTableCell = (function(_this) {
        return function(otcell, options) {
          var elm, elmText, i, l, len, m, n, padLeft, padLength, padLengthLeft, padLengthRight, padRight, ref1, ref2, ref3, ref4, ref5, tcellAlign, tcellText;
          if ((ref1 = otcell != null ? (ref2 = otcell.tagName) != null ? ref2.toLowerCase() : void 0 : void 0) !== 'th' && ref1 !== 'td') {
            return o.html(otcell);
          }
          tcellAlign = options.colAlign;
          tcellText = o(otcell).html();
          ref3 = o(otcell).children();
          for (l = 0, len = ref3.length; l < len; l++) {
            elm = ref3[l];
            elmText = parseElm(elm, options);
            tcellText = literalReplace(tcellText, o.html(elm), elmText, replaceOptions);
          }
          tcellText = tcellText.replace(/\$/g, '\\$$').replace(/\n/g, '');
          if (options.colCharCount != null) {
            if (tcellText.length < (options.colCharCount - 3)) {
              padLength = options.colCharCount - 3 - tcellText.length;
              padLengthLeft = Math.round(padLength * 0.5);
              padLengthRight = padLength - padLengthLeft;
              padLeft = "";
              padRight = "";
              for (i = m = 0, ref4 = padLengthLeft - 1; 0 <= ref4 ? m <= ref4 : m >= ref4; i = 0 <= ref4 ? ++m : --m) {
                padLeft += " ";
              }
              if (padLengthRight > 0) {
                for (i = n = 0, ref5 = padLengthRight - 1; 0 <= ref5 ? n <= ref5 : n >= ref5; i = 0 <= ref5 ? ++n : --n) {
                  padRight += " ";
                }
              }
              switch (tcellAlign) {
                case "left":
                  tcellText += padLeft + padRight;
                  break;
                case "right":
                  tcellText = padLeft + padRight + tcellText;
                  break;
                default:
                  tcellText = padLeft + tcellText + padRight;
              }
            }
          }
          tcellText = " " + tcellText + " |";
          return tcellText;
        };
      })(this);
      parseTableHead = (function(_this) {
        return function(othead, options) {
          var alignText, col, colAlign, colAlignments, colCharCount, colStyles, i, l, len, len1, m, makeCenterAlignment, makeLeftAlignment, makeRightAlignment, ref1, ref2, ref3, styleReg, tHeadRow, tHeadText;
          if ((othead != null ? (ref1 = othead.tagName) != null ? ref1.toLowerCase() : void 0 : void 0) !== 'thead') {
            return o.html(othead);
          }
          if (o(othead).children('tr').length !== 1) {
            return o.html(othead);
          }
          colAlignments = [];
          styleReg = /text\-align\:(.+?)(?:;|(?:))$/i;
          tHeadRow = o(othead).children('tr')[0];
          if (options.maxColCharCount == null) {
            options.maxColCharCount = [];
          }
          i = 0;
          ref2 = o(tHeadRow).children('th');
          for (l = 0, len = ref2.length; l < len; l++) {
            col = ref2[l];
            colStyles = o(col).attr("style");
            if (styleReg.test(colStyles)) {
              colAlign = styleReg.exec(colStyles)[1].trim();
            } else {
              colAlign = "none";
            }
            colAlignments.push(colAlign);
            if (((ref3 = options.maxColCharCount) != null ? ref3[i] : void 0) == null) {
              options.maxColCharCount[i] = o(col).text().length + 3;
            }
            i += 1;
          }
          makeCenterAlignment = function(curColCharCount) {
            var j, m, ref4, tmpAlignText;
            tmpAlignText = " ";
            for (j = m = 1, ref4 = colCharCount - 3; 1 <= ref4 ? m <= ref4 : m >= ref4; j = 1 <= ref4 ? ++m : --m) {
              tmpAlignText += "-";
            }
            tmpAlignText += " |";
            return tmpAlignText;
          };
          makeLeftAlignment = function(curColCharCount) {
            var j, m, ref4, tmpAlignText;
            tmpAlignText = ":";
            for (j = m = 1, ref4 = colCharCount - 3; 1 <= ref4 ? m <= ref4 : m >= ref4; j = 1 <= ref4 ? ++m : --m) {
              tmpAlignText += "-";
            }
            tmpAlignText += " |";
            return tmpAlignText;
          };
          makeRightAlignment = function(curColCharCount) {
            var j, m, ref4, tmpAlignText;
            tmpAlignText = " ";
            for (j = m = 1, ref4 = colCharCount - 3; 1 <= ref4 ? m <= ref4 : m >= ref4; j = 1 <= ref4 ? ++m : --m) {
              tmpAlignText += "-";
            }
            tmpAlignText += ":|";
            return tmpAlignText;
          };
          alignText = "|";
          i = 0;
          for (m = 0, len1 = colAlignments.length; m < len1; m++) {
            colAlign = colAlignments[m];
            colCharCount = options.maxColCharCount[i];
            switch (colAlign) {
              case "center":
                alignText += makeCenterAlignment(colCharCount);
                break;
              case "left":
                alignText += makeLeftAlignment(colCharCount);
                break;
              case "right":
                alignText += makeRightAlignment(colCharCount);
                break;
              default:
                alignText += makeCenterAlignment(colCharCount);
            }
            i += 1;
          }
          tHeadText = parseElm(o(othead).children('tr')[0], options) + alignText + "\n";
          return tHeadText;
        };
      })(this);
      parseTable = (function(_this) {
        return function(otable, options) {
          var col, colAlign, colAlignments, colCharCount, colStyles, elmText, i, l, len, len1, len2, len3, m, maxColCharCount, n, p, ref1, ref2, ref3, ref4, ref5, styleReg, tElm, tText, thead, tr;
          if ((otable != null ? (ref1 = otable.tagName) != null ? ref1.toLowerCase() : void 0 : void 0) !== 'table') {
            return o.html(otable);
          }
          maxColCharCount = [];
          colAlignments = [];
          styleReg = /text\-align\:(.+?)(?:;|(?:))$/i;
          ref2 = o(otable).children('thead, tbody');
          for (l = 0, len = ref2.length; l < len; l++) {
            thead = ref2[l];
            ref3 = o(thead).children('tr');
            for (m = 0, len1 = ref3.length; m < len1; m++) {
              tr = ref3[m];
              i = 0;
              ref4 = o(tr).children('td, th');
              for (n = 0, len2 = ref4.length; n < len2; n++) {
                col = ref4[n];
                colStyles = o(col).attr("style");
                if (styleReg.test(colStyles)) {
                  colAlign = styleReg.exec(colStyles)[1];
                } else {
                  colAlign = "none";
                }
                colCharCount = Math.min(o(col).text().length + 3, 35);
                if (maxColCharCount.length < (i + 1)) {
                  maxColCharCount.push(colCharCount);
                  colAlignments.push(colAlign);
                } else {
                  if (colCharCount > maxColCharCount[i]) {
                    maxColCharCount[i] = colCharCount;
                  }
                }
                if (maxColCharCount[i] < 4) {
                  maxColCharCount[i] = 4;
                }
                i += 1;
              }
            }
          }
          options.maxColCharCount = maxColCharCount;
          options.colAlignments = colAlignments;
          tText = o(otable).html();
          ref5 = o(otable).children();
          for (p = 0, len3 = ref5.length; p < len3; p++) {
            tElm = ref5[p];
            elmText = parseElm(tElm, options);
            tText = literalReplace(tText, o.html(tElm), elmText, replaceOptions);
          }
          tText = stripEmptyLines(htmlDecode(tText)) + "\n";
          return tText;
        };
      })(this);
      parseSup = (function(_this) {
        return function(osup, options) {
          var fnID, fnLink, ref1;
          if ((osup != null ? (ref1 = osup.tagName) != null ? ref1.toLowerCase() : void 0 : void 0) !== 'sup') {
            return o.html(osup);
          }
          if (o(osup).children().length === 1 && o(osup).children('a').length === 1) {
            fnLink = o(osup).children('a')[0];
            fnID = htmlDecode(o(fnLink).attr("href").replace(/#fn\:/i, '')).replace(/%20/g, ' ');
            return "[^" + fnID + "]";
          } else {
            return parseUnknownElement(osup, options);
          }
        };
      })(this);
      parseFootnoteDiv = (function(_this) {
        return function(odiv, options) {
          var fnRefID, fnText, l, len, len1, len2, li, li0, link, link0, listItemText, m, n, ref1, ref2, ref3, ref4, ref5, ref6;
          if ((odiv != null ? (ref1 = odiv.tagName) != null ? ref1.toLowerCase() : void 0 : void 0) !== 'div') {
            return o.html(odiv);
          }
          if (o(odiv).attr("title") !== "footnotes") {
            return parseDiv(odiv);
          }
          if (o(odiv).children('hr').length !== 1) {
            return parseDiv(odiv);
          }
          if (o(odiv).children('ol').length !== 1) {
            return parseDiv(odiv);
          }
          fnText = "\n";
          ref2 = o(odiv).children('ol').children('li');
          for (l = 0, len = ref2.length; l < len; l++) {
            li = ref2[l];
            ref3 = o(li).children('a');
            for (m = 0, len1 = ref3.length; m < len1; m++) {
              link = ref3[m];
              if (((ref4 = o(link).attr("href")) != null ? ref4.indexOf('#fnref:') : void 0) > -1) {
                fnRefID = htmlDecode(o(link).attr("href").replace(/#fnref\:/i, '')).replace(/%20/g, ' ');
                fnText += "[^" + fnRefID + "]: ";
                break;
              }
            }
            li0 = o(o.html(li));
            ref5 = o(li0).children('a');
            for (n = 0, len2 = ref5.length; n < len2; n++) {
              link0 = ref5[n];
              if (((ref6 = o(link0).attr("href")) != null ? ref6.indexOf('#fnref:') : void 0) > -1) {
                o(link0).remove();
                break;
              }
            }
            listItemText = parseListItem(o(li0)[0], options).replace(/\[.+?\]\(.+?\)/i, '');
            fnText += listItemText.replace(/\n{2,}/g, '\n') + "\n\n";
          }
          fnText = htmlDecode(fnText);
          return fnText;
        };
      })(this);
      parseDiv = (function(_this) {
        return function(odiv, options) {
          var divClass, divElm, divHTML, divStyle, divText, divTitle, elmText, k, l, len, newOptions, paragraphStyle, ref1, ref2, ref3, ref4, styledDiv, v;
          if ((odiv != null ? (ref1 = odiv.tagName) != null ? ref1.toLowerCase() : void 0 : void 0) !== 'div') {
            return o.html(odiv);
          }
          if ((ref2 = o(odiv).attr("title")) === "MathJax_SVG_Display") {
            return "";
          }
          if ((ref3 = o(odiv).attr("class")) === "MathJax_SVG_Display") {
            return "";
          }
          paragraphStyle = ['margin: 15px 0; margin-top: 0;', 'margin: 15px 0;'];
          divStyle = o(odiv).attr("style");
          divClass = o(odiv).attr("class");
          divTitle = o(odiv).attr("title");
          if (divTitle === "footnotes" && o(odiv).children().length === 2 && o(odiv).children('hr').length === 1 && o(odiv).children('ol').length === 1) {
            return parseFootnoteDiv(odiv, options);
          }
          if (divClass !== "ever-notedown-preview" && (divStyle != null) && !(indexOf.call(paragraphStyle, divStyle) >= 0)) {
            divHTML = o.html(odiv);
            styledDiv = true;
          } else {
            styledDiv = false;
            divHTML = "\n" + o(odiv).html() + "\n";
          }
          divText = divHTML;
          newOptions = {};
          for (k in options) {
            v = options[k];
            newOptions[k] = v;
          }
          newOptions.styledDiv = true;
          ref4 = o(odiv).children();
          for (l = 0, len = ref4.length; l < len; l++) {
            divElm = ref4[l];
            elmText = parseElm(divElm, newOptions);
            divText = literalReplace(divText, o.html(divElm), elmText, replaceOptions);
          }
          divText = htmlDecode(divText);
          return divText;
        };
      })(this);
      parseUnknownElement = (function(_this) {
        return function(oelm, options) {
          var childElm, childElmText, elmHTML, elmText, l, len, oldElmText, ref1;
          if (o(oelm).length !== 1) {
            return;
          }
          elmHTML = o(oelm).html();
          elmText = elmHTML;
          ref1 = o(oelm).children();
          for (l = 0, len = ref1.length; l < len; l++) {
            childElm = ref1[l];
            childElmText = parseElm(childElm, options);
            oldElmText = elmText;
            elmText = literalReplace(elmText, o.html(childElm), childElmText, replaceOptions);
          }
          elmText = htmlDecode(elmText);
          return elmText;
        };
      })(this);
      parseElm = (function(_this) {
        return function(oelm, options) {
          var childElm, childElmText, elmText, elmsHTML, elmsText, l, len, ref1, tag;
          if (!(o(oelm).length >= 1)) {
            return "";
          }
          if (o(oelm).length > 1) {
            elmsHTML = o.html(oelm);
            elmsText = elmsHTML;
            for (l = 0, len = oelm.length; l < len; l++) {
              childElm = oelm[l];
              childElmText = parseElm(childElm, options);
              elmsText = literalReplace(elmsText, o.html(childElm), childElmText, replaceOptions);
            }
            elmText = htmlDecode(elmsText);
          } else {
            tag = (ref1 = oelm.tagName) != null ? ref1 : "";
            tag = tag.toLowerCase();
            if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') {
              elmText = parseHeaders(oelm, options);
            } else {
              switch (tag) {
                case 'p':
                  elmText = parseParagraph(oelm, options);
                  break;
                case 'pre':
                  elmText = parsePre(oelm, options);
                  break;
                case 'img':
                  elmText = parseImage(oelm, options);
                  break;
                case 'embed':
                  elmText = parseEmbed(oelm, options);
                  break;
                case 'code':
                  elmText = parseCode(oelm, options);
                  break;
                case 'kbd':
                  elmText = parseKBD(oelm, options);
                  break;
                case 'a':
                  elmText = parseLink(oelm, options);
                  break;
                case 'strong':
                  elmText = parseStrong(oelm, options);
                  break;
                case 'b':
                  elmText = parseStrong(oelm, options);
                  break;
                case 'em':
                  elmText = parseEmphasis(oelm, options);
                  break;
                case 'i':
                  elmText = parseEmphasis(oelm, options);
                  break;
                case 'u':
                  elmText = parseUnderscore(oelm, options);
                  break;
                case 'del':
                  elmText = parseDel(oelm, options);
                  break;
                case 'span':
                  elmText = parseSpan(oelm, options);
                  break;
                case 'ul':
                  elmText = parseUnorderedList(oelm, options);
                  break;
                case 'ol':
                  elmText = parseOrderedList(oelm, options);
                  break;
                case 'blockquote':
                  elmText = parseBlockquote(oelm, options);
                  break;
                case 'hr':
                  elmText = parseHR(oelm, options);
                  break;
                case 'br':
                  elmText = parseLineBreak(oelm, options);
                  break;
                case 'div':
                  elmText = parseDiv(oelm, options);
                  break;
                case 'label':
                  elmText = parseLabel(oelm, options);
                  break;
                case 'object':
                  elmText = parseObject(oelm, options);
                  break;
                case 'input':
                  elmText = parseInput(oelm, options);
                  break;
                case 'table':
                  elmText = parseTable(oelm, options);
                  break;
                case 'thead':
                  elmText = parseTableHead(oelm, options);
                  break;
                case 'tbody':
                  elmText = parseTableBody(oelm, options);
                  break;
                case 'tr':
                  elmText = parseTableRow(oelm, options);
                  break;
                case 'th':
                  elmText = parseTableCell(oelm, options);
                  break;
                case 'td':
                  elmText = parseTableCell(oelm, options);
                  break;
                case 'sup':
                  elmText = parseSup(oelm, options);
                  break;
                default:
                  elmText = parseUnknownElement(oelm, options);
              }
            }
          }
          return elmText;
        };
      })(this);
      rootElms = o.root().children();
      if (rootElms.length === 1 && rootElms[0].tagName === 'div') {
        html = o(rootElms[0]).html();
        o = cheerio.load(html);
      }
      ref1 = o('div');
      for (l = 0, len = ref1.length; l < len; l++) {
        div = ref1[l];
        if (o(div).css("display") === "none") {
          o(div).remove();
        }
      }
      ref2 = o('ul');
      for (m = 0, len1 = ref2.length; m < len1; m++) {
        ul = ref2[m];
        if (o(ul).attr("title") === "\"table-of-contents\"") {
          o(ul).after("<p>   </p><p>{!toc}</p><p>   </p>");
          o(ul).remove();
        }
      }
      ref3 = o('p');
      for (n = 0, len2 = ref3.length; n < len2; n++) {
        paragraph = ref3[n];
        if (o(paragraph).children().length === 0 && o(paragraph).text().trim().length === 0) {
          o(paragraph).remove();
        }
      }
      r = /^(?:(?:)|(.+?))display\:(?:(?:)|(?:\s*)none;(?:(?:)|(?:.+?)))$/i;
      ref4 = o('img');
      for (p = 0, len3 = ref4.length; p < len3; p++) {
        img = ref4[p];
        if (r.test(o(img).attr("style"))) {
          o(img).remove();
        }
      }
      ref5 = o('embed');
      for (q = 0, len4 = ref5.length; q < len4; q++) {
        ebd = ref5[q];
        if (r.test(o(ebd).attr("style"))) {
          o(ebd).remove();
        }
      }
      ref6 = o('script');
      for (s = 0, len5 = ref6.length; s < len5; s++) {
        scrpt = ref6[s];
        if (o(scrpt).attr("type").indexOf("math/tex") > -1) {
          o(scrpt).remove();
        }
      }
      ref7 = o('span.math');
      for (t = 0, len6 = ref7.length; t < len6; t++) {
        sp = ref7[t];
        o(sp).remove();
      }
      ref8 = o('span');
      for (u = 0, len7 = ref8.length; u < len7; u++) {
        sp = ref8[u];
        if (o(sp).html().trim().length === 0) {
          o(sp).remove();
        }
      }
      replaceOptions = {
        replaceOnce: true
      };
      markdownText = parseElm(o.root().children(), options);
      if ((refs != null ? refs.length : void 0) > 0) {
        for (w = 0, len8 = refs.length; w < len8; w++) {
          refDef = refs[w];
          if (refDef == null) {
            continue;
          }
          markdownText += refDef + "\n";
        }
      }
      markdownText = convertHexNCR2String(markdownText);
      return markdownText;
    };
  });

}).call(this);

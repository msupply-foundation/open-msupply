var suggestions = document.getElementById('suggestions');
var userinput = document.getElementById('userinput');

document.addEventListener('keydown', inputFocus);

function inputFocus(e) {
  if (e.keyCode === 191
      && document.activeElement.tagName !== "INPUT"
      && document.activeElement.tagName !== "TEXTAREA") {
    e.preventDefault();
    userinput.focus();
  }

  if (e.keyCode === 27) {
    if (userinput.value !== '') {
      userinput.value = '';
      suggestions.classList.add('d-none');
      while (suggestions.firstChild) suggestions.removeChild(suggestions.firstChild);
      selectedIndex = -1;
    } else {
      userinput.blur();
      suggestions.classList.add('d-none');
    }
  }
}

document.addEventListener('click', function(event) {
  var isClickInsideElement = suggestions.contains(event.target);
  if (!isClickInsideElement) {
    suggestions.classList.add('d-none');
  }
});

// Prevent form submission — Enter is handled via keyboard nav below
userinput.closest('form').addEventListener('submit', function(e) {
  e.preventDefault();
});

var selectedIndex = -1;

function updateSelection() {
  var items = suggestions.querySelectorAll('a');
  for (var i = 0; i < items.length; i++) {
    items[i].classList.toggle('is-selected', i === selectedIndex);
  }
}

function handleSearchKeys(e) {
  var items = suggestions.querySelectorAll('a');
  if (suggestions.classList.contains('d-none') || items.length === 0) {
    return;
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    e.stopPropagation();
    selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
    updateSelection();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    e.stopPropagation();
    selectedIndex--;
    if (selectedIndex < 0) selectedIndex = -1;
    updateSelection();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    e.stopPropagation();
    var target = selectedIndex >= 0 ? items[selectedIndex] : items[0];
    if (target) window.location.href = target.href;
  }
}

// Listen on the input directly so arrow keys are caught before scrolling
userinput.addEventListener('keydown', handleSearchKeys);

// Also handle keys when a suggestion link has focus
suggestions.addEventListener('keydown', handleSearchKeys);

// Reset selection when input changes
userinput.addEventListener('input', function() {
  selectedIndex = -1;
  updateSelection();
});

(function() {
  var index = elasticlunr.Index.load(window.searchIndex);
  var debounceTimer = null;
  var MAX_RESULTS = 10;

  // Build a flat array of all documents for substring fallback search.
  // This is fast for docs sites (typically <500 pages).
  var allDocs = [];
  var docStore = index.documentStore;
  if (docStore && docStore.docs) {
    for (var ref in docStore.docs) {
      if (docStore.docs.hasOwnProperty(ref)) {
        allDocs.push({ ref: ref, doc: docStore.docs[ref] });
      }
    }
  }

  userinput.addEventListener('input', function() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(show_results.bind(this), 120);
  }, true);

  suggestions.addEventListener('click', accept_suggestion, true);

  function show_results() {
    var value = this.value.trim();

    if (value.length < 1) {
      suggestions.classList.add('d-none');
      while (suggestions.firstChild) {
        suggestions.removeChild(suggestions.firstChild);
      }
      return;
    }

    var options = {
      bool: "OR",
      expand: true,
      fields: {
        title: {boost: 2},
        body: {boost: 1},
      }
    };

    // Primary: elasticlunr search (stemmed + prefix expansion)
    var elasticResults = index.search(value, options);

    // Fallback: raw substring matching on title and body.
    // Catches mid-stem typing like "usi" matching "using" that elasticlunr misses
    // because its stemmer transforms "usi"→"usi" which isn't a prefix of "use".
    var valueLower = value.toLowerCase();
    var queryTerms = valueLower.split(/\s+/).filter(function(t) { return t.length > 0; });
    var seenRefs = {};
    var merged = [];

    // Add elasticlunr results first (already ranked by relevance)
    for (var i = 0; i < elasticResults.length; i++) {
      var r = elasticResults[i];
      seenRefs[r.ref] = true;
      merged.push(r);
    }

    // Substring fallback — only scan if elasticlunr gave few results
    if (merged.length < MAX_RESULTS && queryTerms.length > 0) {
      var substringMatches = [];
      for (var i = 0; i < allDocs.length; i++) {
        var doc = allDocs[i];
        if (seenRefs[doc.ref]) continue;

        var titleLower = (doc.doc.title || '').toLowerCase();
        var bodyLower = (doc.doc.body || '').toLowerCase();
        var titleMatch = false;

        // All query terms must appear somewhere (AND for substring)
        var allMatch = true;
        for (var j = 0; j < queryTerms.length; j++) {
          var inTitle = titleLower.indexOf(queryTerms[j]) !== -1;
          var inBody = bodyLower.indexOf(queryTerms[j]) !== -1;
          if (inTitle) titleMatch = true;
          if (!inTitle && !inBody) {
            allMatch = false;
            break;
          }
        }

        if (allMatch) {
          // Score: title matches ranked higher
          var score = titleMatch ? 0.5 : 0.1;
          substringMatches.push({ ref: doc.ref, doc: doc.doc, score: score });
        }
      }

      // Sort substring matches: title matches first
      substringMatches.sort(function(a, b) { return b.score - a.score; });

      for (var i = 0; i < substringMatches.length && merged.length < MAX_RESULTS; i++) {
        merged.push(substringMatches[i]);
      }
    }

    var items = value.split(/\s+/);
    suggestions.classList.remove('d-none');

    // Clear previous results
    while (suggestions.firstChild) {
      suggestions.removeChild(suggestions.firstChild);
    }

    if (merged.length === 0) {
      var noResult = document.createElement('div');
      noResult.className = 'search-no-results';
      noResult.textContent = 'No results for "' + value + '"';
      suggestions.appendChild(noResult);
      return;
    }

    var count = Math.min(merged.length, MAX_RESULTS);
    for (var i = 0; i < count; i++) {
      var page = merged[i];
      var entry = document.createElement('div');
      entry.innerHTML = '<a href><span class="search-title"><span class="search-title-text"></span><span class="search-path"></span></span><span class="search-teaser"></span></a>';

      var a = entry.querySelector('a'),
          t = entry.querySelector('.search-title-text'),
          p = entry.querySelector('.search-path'),
          d = entry.querySelector('.search-teaser');
      a.href = page.ref;
      t.innerHTML = highlightTerms(page.doc.title || '', items);
      p.textContent = buildPath(page.ref);
      d.innerHTML = (page.doc.body && page.doc.body !== '')
        ? makeTeaser(page.doc.body, items)
        : '';

      suggestions.appendChild(entry);
    }
  }

  function accept_suggestion() {
    while (suggestions.lastChild) {
      suggestions.removeChild(suggestions.lastChild);
    }
    return false;
  }

  // Highlight matched terms in a text string (for titles)
  function highlightTerms(text, terms) {
    if (!text || terms.length === 0) return escapeHtml(text);

    var stemmedTerms = terms.map(function(w) {
      return elasticlunr.stemmer(w.toLowerCase());
    });
    var rawTerms = terms.map(function(w) { return w.toLowerCase(); });

    // Split text into words, check each for matches
    var result = [];
    var words = text.split(/(\s+)/); // keep whitespace as separators
    for (var i = 0; i < words.length; i++) {
      var word = words[i];
      if (/^\s+$/.test(word)) {
        result.push(word);
        continue;
      }
      var wordLower = word.toLowerCase();
      var stemmed = elasticlunr.stemmer(wordLower);
      var matched = false;

      for (var j = 0; j < stemmedTerms.length; j++) {
        if (stemmed.startsWith(stemmedTerms[j]) || wordLower.indexOf(rawTerms[j]) !== -1) {
          matched = true;
          break;
        }
      }

      if (matched) {
        result.push('<b>' + escapeHtml(word) + '</b>');
      } else {
        result.push(escapeHtml(word));
      }
    }
    return result.join('');
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Build a breadcrumb path from a URL like /server/service/sync/ → "server / service"
  // Shows parent segments only (the title already shows the page name)
  function buildPath(ref) {
    var segments = ref.replace(/^\/|\/$/g, '').split('/');
    if (segments.length <= 1) return '';
    // Drop the last segment (that's the page itself, shown as title)
    segments.pop();
    return segments.join(' / ');
  }

  // Taken from mdbook
  // The strategy is as follows:
  // First, assign a value to each word in the document:
  //  Words that correspond to search terms (stemmer aware): 40
  //  Normal words: 2
  //  First word in a sentence: 8
  // Then use a sliding window with a constant number of words and count the
  // sum of the values of the words within the window. Then use the window that got the
  // maximum sum. If there are multiple maximas, then get the last one.
  // Enclose the terms in <b>.
  function makeTeaser(body, terms) {
    var TERM_WEIGHT = 40;
    var NORMAL_WORD_WEIGHT = 2;
    var FIRST_WORD_WEIGHT = 8;
    var TEASER_MAX_WORDS = 30;

    var stemmedTerms = terms.map(function(w) {
      return elasticlunr.stemmer(w.toLowerCase());
    });
    var rawTerms = terms.map(function(w) { return w.toLowerCase(); });
    var termFound = false;
    var index = 0;
    var weighted = [];

    var sentences = body.toLowerCase().split(". ");
    for (var i in sentences) {
      var words = sentences[i].split(/[\s\n]/);
      var value = FIRST_WORD_WEIGHT;
      for (var j in words) {
        var word = words[j];

        if (word.length > 0) {
          var stemmed = elasticlunr.stemmer(word);
          for (var k in stemmedTerms) {
            // Match on stemmed prefix OR raw substring
            if (stemmed.startsWith(stemmedTerms[k]) || word.indexOf(rawTerms[k]) !== -1) {
              value = TERM_WEIGHT;
              termFound = true;
            }
          }
          weighted.push([word, value, index]);
          value = NORMAL_WORD_WEIGHT;
        }

        index += word.length;
        index += 1;
      }

      index += 1;
    }

    if (weighted.length === 0) {
      if (body.length !== undefined && body.length > TEASER_MAX_WORDS * 10) {
        return body.substring(0, TEASER_MAX_WORDS * 10) + '...';
      } else {
        return body;
      }
    }

    var windowWeights = [];
    var windowSize = Math.min(weighted.length, TEASER_MAX_WORDS);
    var curSum = 0;
    for (var i = 0; i < windowSize; i++) {
      curSum += weighted[i][1];
    }
    windowWeights.push(curSum);

    for (var i = 0; i < weighted.length - windowSize; i++) {
      curSum -= weighted[i][1];
      curSum += weighted[i + windowSize][1];
      windowWeights.push(curSum);
    }

    var maxSumIndex = 0;
    if (termFound) {
      var maxFound = 0;
      for (var i = windowWeights.length - 1; i >= 0; i--) {
        if (windowWeights[i] > maxFound) {
          maxFound = windowWeights[i];
          maxSumIndex = i;
        }
      }
    }

    var teaser = [];
    var startIndex = weighted[maxSumIndex][2];
    for (var i = maxSumIndex; i < maxSumIndex + windowSize; i++) {
      var word = weighted[i];
      if (startIndex < word[2]) {
        teaser.push(body.substring(startIndex, word[2]));
        startIndex = word[2];
      }

      if (word[1] === TERM_WEIGHT) {
        teaser.push("<b>");
      }

      startIndex = word[2] + word[0].length;
      var re = /^[\x00-\xff]+$/;
      if (word[1] !== TERM_WEIGHT && word[0].length >= 12 && !re.test(word[0])) {
        var strBefor = body.substring(word[2], startIndex);
        var strAfter = substringByByte(strBefor, 12);
        teaser.push(strAfter);
      } else {
        teaser.push(body.substring(word[2], startIndex));
      }

      if (word[1] === TERM_WEIGHT) {
        teaser.push("</b>");
      }
    }
    teaser.push("…");
    return teaser.join("");
  }
}());

function substringByByte(str, maxLength) {
  var result = "";
  var flag = false;
  var len = 0;
  var length = 0;
  var length2 = 0;
  for (var i = 0; i < str.length; i++) {
    var code = str.codePointAt(i).toString(16);
    if (code.length > 4) {
      i++;
      if ((i + 1) < str.length) {
        flag = str.codePointAt(i + 1).toString(16) == "200d";
      }
    }
    if (flag) {
      len += getByteByHex(code);
      if (i == str.length - 1) {
        length += len;
        if (length <= maxLength) {
          result += str.substr(length2, i - length2 + 1);
        } else {
          break;
        }
      }
    } else {
      if (len != 0) {
        length += len;
        length += getByteByHex(code);
        if (length <= maxLength) {
          result += str.substr(length2, i - length2 + 1);
          length2 = i + 1;
        } else {
          break;
        }
        len = 0;
        continue;
      }
      length += getByteByHex(code);
      if (length <= maxLength) {
        if (code.length <= 4) {
          result += str[i];
        } else {
          result += str[i - 1] + str[i];
        }
        length2 = i + 1;
      } else {
        break;
      }
    }
  }
  return result;
}

function getByteByBinary(binaryCode) {
  var byteLengthDatas = [0, 1, 2, 3, 4];
  var len = byteLengthDatas[Math.ceil(binaryCode.length / 8)];
  return len;
}

function getByteByHex(hexCode) {
  return getByteByBinary(parseInt(hexCode, 16).toString(2));
}

(function() {
  var params = new URLSearchParams(window.location.search);
  var query = params.get('q') || '';
  var heading = document.getElementById('search-heading');
  var container = document.getElementById('search-results');
  var searchInput = document.getElementById('userinput');

  if (!query) {
    heading.textContent = 'Search';
    container.innerHTML = '<p>Enter a search term above.</p>';
    return;
  }

  // Pre-fill the header search input
  if (searchInput) searchInput.value = query;

  // Wait for search index to load
  function waitForIndex(cb) {
    if (window.searchIndex && window.elasticlunr) {
      cb();
    } else {
      setTimeout(function() { waitForIndex(cb); }, 50);
    }
  }

  waitForIndex(function() {
    var index = elasticlunr.Index.load(window.searchIndex);

    var options = {
      bool: "OR",
      expand: true,
      fields: {
        title: {boost: 2},
        body: {boost: 1},
      }
    };

    var elasticResults = index.search(query, options);

    // Substring fallback (same logic as dropdown)
    var queryTerms = query.toLowerCase().split(/\s+/).filter(function(t) { return t.length > 0; });
    var seenRefs = {};
    var merged = [];

    for (var i = 0; i < elasticResults.length; i++) {
      seenRefs[elasticResults[i].ref] = true;
      merged.push(elasticResults[i]);
    }

    var allDocs = [];
    var docStore = index.documentStore;
    if (docStore && docStore.docs) {
      for (var ref in docStore.docs) {
        if (docStore.docs.hasOwnProperty(ref)) {
          allDocs.push({ ref: ref, doc: docStore.docs[ref] });
        }
      }
    }

    if (queryTerms.length > 0) {
      for (var i = 0; i < allDocs.length; i++) {
        var doc = allDocs[i];
        if (seenRefs[doc.ref]) continue;

        var titleLower = (doc.doc.title || '').toLowerCase();
        var bodyLower = (doc.doc.body || '').toLowerCase();
        var titleMatch = false;
        var allMatch = true;

        for (var j = 0; j < queryTerms.length; j++) {
          var inTitle = titleLower.indexOf(queryTerms[j]) !== -1;
          var inBody = bodyLower.indexOf(queryTerms[j]) !== -1;
          if (inTitle) titleMatch = true;
          if (!inTitle && !inBody) { allMatch = false; break; }
        }

        if (allMatch) {
          merged.push({ ref: doc.ref, doc: doc.doc, score: titleMatch ? 0.5 : 0.1 });
        }
      }
    }

    heading.textContent = merged.length + ' result' + (merged.length !== 1 ? 's' : '') + ' for "' + query + '"';

    if (merged.length === 0) {
      container.innerHTML = '<p>No pages matched your search. Try different keywords.</p>';
      return;
    }

    var items = query.split(/\s+/);
    var html = '';
    for (var i = 0; i < merged.length; i++) {
      var page = merged[i];
      var title = escapeHtml(page.doc.title || 'Untitled');
      var path = buildPath(page.ref);
      var teaser = (page.doc.body && page.doc.body !== '')
        ? makeTeaser(page.doc.body, items)
        : '';

      html += '<div class="search-result">';
      html += '<a href="' + escapeHtml(page.ref) + '" class="search-result-title">' + highlightTerms(page.doc.title || '', items) + '</a>';
      if (path) html += '<span class="search-result-path">' + escapeHtml(path) + '</span>';
      if (teaser) html += '<p class="search-result-teaser">' + teaser + '</p>';
      html += '</div>';
    }
    container.innerHTML = html;
  });

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function buildPath(ref) {
    var path = ref.replace(/^https?:\/\/[^\/]+/, '');
    var segments = path.replace(/^\/|\/$/g, '').split('/');
    if (segments.length <= 1) return '';
    segments.pop();
    return segments.join(' / ');
  }

  function highlightTerms(text, terms) {
    if (!text || terms.length === 0) return escapeHtml(text);
    var stemmedTerms = terms.map(function(w) { return elasticlunr.stemmer(w.toLowerCase()); });
    var rawTerms = terms.map(function(w) { return w.toLowerCase(); });
    var result = [];
    var words = text.split(/(\s+)/);
    for (var i = 0; i < words.length; i++) {
      var word = words[i];
      if (/^\s+$/.test(word)) { result.push(word); continue; }
      var wordLower = word.toLowerCase();
      var stemmed = elasticlunr.stemmer(wordLower);
      var matched = false;
      for (var j = 0; j < stemmedTerms.length; j++) {
        if (stemmed.startsWith(stemmedTerms[j]) || wordLower.indexOf(rawTerms[j]) !== -1) {
          matched = true; break;
        }
      }
      result.push(matched ? '<b>' + escapeHtml(word) + '</b>' : escapeHtml(word));
    }
    return result.join('');
  }

  function makeTeaser(body, terms) {
    var TERM_WEIGHT = 40, NORMAL_WORD_WEIGHT = 2, FIRST_WORD_WEIGHT = 8, TEASER_MAX_WORDS = 50;
    var stemmedTerms = terms.map(function(w) { return elasticlunr.stemmer(w.toLowerCase()); });
    var rawTerms = terms.map(function(w) { return w.toLowerCase(); });
    var termFound = false, idx = 0, weighted = [];

    var sentences = body.toLowerCase().split(". ");
    for (var i in sentences) {
      var words = sentences[i].split(/[\s\n]/);
      var value = FIRST_WORD_WEIGHT;
      for (var j in words) {
        var word = words[j];
        if (word.length > 0) {
          var stemmed = elasticlunr.stemmer(word);
          for (var k in stemmedTerms) {
            if (stemmed.startsWith(stemmedTerms[k]) || word.indexOf(rawTerms[k]) !== -1) {
              value = TERM_WEIGHT; termFound = true;
            }
          }
          weighted.push([word, value, idx]);
          value = NORMAL_WORD_WEIGHT;
        }
        idx += word.length + 1;
      }
      idx += 1;
    }

    if (weighted.length === 0) {
      return body.length > TEASER_MAX_WORDS * 10
        ? body.substring(0, TEASER_MAX_WORDS * 10) + '...'
        : body;
    }

    var windowSize = Math.min(weighted.length, TEASER_MAX_WORDS);
    var curSum = 0;
    for (var i = 0; i < windowSize; i++) curSum += weighted[i][1];
    var windowWeights = [curSum];
    for (var i = 0; i < weighted.length - windowSize; i++) {
      curSum -= weighted[i][1];
      curSum += weighted[i + windowSize][1];
      windowWeights.push(curSum);
    }

    var maxSumIndex = 0;
    if (termFound) {
      var maxFound = 0;
      for (var i = windowWeights.length - 1; i >= 0; i--) {
        if (windowWeights[i] > maxFound) { maxFound = windowWeights[i]; maxSumIndex = i; }
      }
    }

    var teaser = [];
    var startIndex = weighted[maxSumIndex][2];
    for (var i = maxSumIndex; i < maxSumIndex + windowSize; i++) {
      var word = weighted[i];
      if (startIndex < word[2]) { teaser.push(body.substring(startIndex, word[2])); startIndex = word[2]; }
      if (word[1] === TERM_WEIGHT) teaser.push("<b>");
      startIndex = word[2] + word[0].length;
      teaser.push(body.substring(word[2], startIndex));
      if (word[1] === TERM_WEIGHT) teaser.push("</b>");
    }
    teaser.push("…");
    return teaser.join("");
  }
}());

(function (root, factory) {
    const engine = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = engine;
    } else {
        root.FuriganaEngine = engine;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    function escapeHtml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }

    function splitByScript(text) {
        return String(text).match(/([\u4E00-\u9FFF]+|[\u3040-\u309F]+|[\u30A0-\u30FF]+|[^\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]+)/g) || [];
    }

    function buildOkuriganaKanjiSet(dictionary) {
        const result = new Set();
        for (const word of Object.keys(dictionary)) {
            if (/^[\u4E00-\u9FFF]+[\u3040-\u309F]+$/.test(word)) {
                result.add(word[0]);
            }
        }
        return result;
    }

    function generateRubyHtml(text, dictionary, suppliedOkuriganaSet) {
        const okuriganaKanjiSet = suppliedOkuriganaSet || buildOkuriganaKanjiSet(dictionary);
        const segments = splitByScript(text);
        let html = '';

        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];

            if (okuriganaKanjiSet.has(segment[0]) && /[\u4E00-\u9FFF]/.test(segment[0])) {
                const nextSegment = segments[i + 1];
                if (nextSegment && /^[\u3040-\u309F]+$/.test(nextSegment)) {
                    let match = null;
                    for (let length = nextSegment.length; length >= 1; length--) {
                        const combined = segment + nextSegment.slice(0, length);
                        if (dictionary[combined]) {
                            match = { combined, length, fullReading: dictionary[combined][0] };
                            break;
                        }
                    }

                    if (match) {
                        const okurigana = nextSegment.slice(0, match.length);
                        const rubyReading = match.fullReading.endsWith(okurigana)
                            ? match.fullReading.slice(0, -okurigana.length)
                            : match.fullReading;
                        html += `<span class="okurigana-group" data-okurigana="${escapeHtml(match.combined)}" data-reading="${escapeHtml(match.fullReading)}"><ruby>${escapeHtml(segment)}<rt>${escapeHtml(rubyReading)}</rt></ruby><span class="okurigana">${escapeHtml(okurigana)}</span></span>`;
                        html += escapeHtml(nextSegment.slice(match.length));
                        i++;
                        continue;
                    }
                }
            }

            if (dictionary[segment] && segment.length > 1) {
                html += `<ruby>${escapeHtml(segment)}<rt>${escapeHtml(dictionary[segment][0])}</rt></ruby>`;
                continue;
            }

            for (const character of segment) {
                if (dictionary[character]) {
                    html += `<ruby>${escapeHtml(character)}<rt>${escapeHtml(dictionary[character][0])}</rt></ruby>`;
                } else {
                    html += escapeHtml(character);
                }
            }
        }

        return html;
    }

    return {
        buildOkuriganaKanjiSet,
        escapeHtml,
        generateRubyHtml,
        splitByScript
    };
}));

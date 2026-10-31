with open('frontend/js/revio-app.js', 'r', encoding='utf-8') as f:
    code = f.read()

target = """    // Auto-detect review column
    let reviewColIdx = headers.findIndex(h => {
      const s = h.toLowerCase();
      return s.includes('review') || s.includes('text') || s.includes('comment') || s.includes('feedback') || s.includes('content');
    });
    if (reviewColIdx === -1) reviewColIdx = 0;"""

replacement = """    // Auto-detect review column (avoid ID columns)
    let reviewColIdx = headers.findIndex(h => {
      const s = h.toLowerCase().trim();
      if (s === 'id' || s.endsWith('_id') || s.startsWith('id_')) return false;
      return s.includes('review') || s.includes('text') || s.includes('comment') || s.includes('feedback') || s.includes('content');
    });
    if (reviewColIdx === -1) reviewColIdx = 0;"""

assert target in code, 'target not found'
code = code.replace(target, replacement, 1)

with open('frontend/js/revio-app.js', 'w', encoding='utf-8') as f:
    f.write(code)

print('Successfully patched reviewColIdx auto-detection')

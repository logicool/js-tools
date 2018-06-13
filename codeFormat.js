export function formatQuest(source) {
  if (looksLikeHtml(source)) {
    return formatXml(source)
  }
  if (looksLikeJson(source)) {
    return formatJson(source)
  }
  return source
}

export function looksLikeJson(source) {
  // {} or [] - looks like json
  var trimmed = source.replace(/^[ \t\n\r]+/, '')
  return trimmed && (trimmed.substring(0, 1) === '{' || trimmed.substring(0, 1) === '[')
}

export function looksLikeHtml(source) {
  // <foo> - looks like html
  var trimmed = source.replace(/^[ \t\n\r]+/, '')
  return trimmed && (trimmed.substring(0, 1) === '<')
}

export function formatXml(text) {
  // 去掉多余的空格
  text = '\n' + text.replace(/(<\w+)(\s.*?>)/g, function($0, name, props) {
    return name + ' ' + props.replace(/\s+(\w+=)/g, ' $1')
  }).replace(/>\s*?</g, '>\n<')

  // 把注释编码
  text = text.replace(/\n/g, '\r').replace(/<!--(.+?)-->/g, function($0, text) {
    var ret = '<!--' + escape(text) + '-->'
    // alert(ret);
    return ret
  }).replace(/\r/g, '\n')

  // 调整格式
  var rgx = /\n(<(([^\?]).+?)(?:\s|\s*?>|\s*?(\/)>)(?:.*?(?:(?:(\/)>)|(?:<(\/)\2>)))?)/mg
  var nodeStack = []
  var output = text.replace(rgx, function($0, all, name, isBegin, isCloseFull1, isCloseFull2, isFull1, isFull2) {
    var isClosed = (isCloseFull1 === '/') || (isCloseFull2 === '/') || (isFull1 === '/') || (isFull2 === '/')
    // alert([all,isClosed].join('='));
    var prefix = ''
    if (isBegin === '!') {
      prefix = getPrefix(nodeStack.length)
    } else {
      if (isBegin !== '/') {
        prefix = getPrefix(nodeStack.length)
        if (!isClosed) {
          nodeStack.push(name)
        }
      } else {
        nodeStack.pop()
        prefix = getPrefix(nodeStack.length)
      }
    }
    var ret = '\n' + prefix + all
    return ret
  })

  // var prefixSpace = -1
  var outputText = output.substring(1)
  // alert(outputText);

  // 把注释还原并解码，调格式
  outputText = outputText.replace(/\n/g, '\r').replace(/(\s*)<!--(.+?)-->/g, function($0, prefix, text) {
    // alert(['[',prefix,']=',prefix.length].join(''));
    if (prefix.charAt(0) === '\r') { prefix = prefix.substring(1) }
    text = unescape(text).replace(/\r/g, '\n')
    var ret = '\n' + prefix + '<!--' + text.replace(/^\s*/mg, prefix) + '-->'
    // alert(ret);
    return ret
  })

  return outputText.replace(/\s+$/g, '').replace(/\r/g, '\r\n')
}

function getPrefix(prefixIndex) {
  var span = '    '
  var output = []
  for (var i = 0; i < prefixIndex; ++i) {
    output.push(span)
  }

  return output.join('')
}

/**
 * 格式化json
 * @param {*} json
 * @param {*} options
 */
export function formatJson(json, options = {}) {
  var reg = null
  var formatted = ''
  var pad = 0
  var PADDING = '    '
  options.newlineAfterColonIfBeforeBraceOrBracket = (options.newlineAfterColonIfBeforeBraceOrBracket === true)
  options.spaceAfterColon = options.spaceAfterColon !== false
  if (typeof json !== 'string') {
    json = JSON.stringify(json)
  } else {
    // json = JSON.parse(json)
    /*eslint-disable */
    json = eval('(' + json + ')')
    json = JSON.stringify(json)
  }
  reg = /([\{\}])/g
  json = json.replace(reg, '\r\n$1\r\n')
  reg = /([\[\]])/g
  json = json.replace(reg, '\r\n$1\r\n')
  reg = /(\,)/g
  json = json.replace(reg, '$1\r\n')
  reg = /(\r\n\r\n)/g
  json = json.replace(reg, '\r\n')
  reg = /\r\n\,/g
  json = json.replace(reg, ',')
  if (!options.newlineAfterColonIfBeforeBraceOrBracket) {
    reg = /\:\r\n\{/g
    json = json.replace(reg, ':{')
    reg = /\:\r\n\[/g
    json = json.replace(reg, ':[')
  }
  if (options.spaceAfterColon) {
    reg = /\:/g
    json = json.replace(reg, ':')
  }
  json.split('\r\n').forEach(function(node, index) {
    if (!node.match(/[\S]/)) return
    var i = 0
    var indent = 0
    var padding = ''

    if (node.match(/\{$/) || node.match(/\[$/)) {
      indent = 1
    } else if (node.match(/\}/) || node.match(/\]/)) {
      if (pad !== 0) {
        pad -= 1
      }
    } else {
      indent = 0
    }

    for (i = 0; i < pad; i++) {
      padding += PADDING
    }

    formatted += padding + node + '\r\n'
    pad += indent
  })
  return formatted
}

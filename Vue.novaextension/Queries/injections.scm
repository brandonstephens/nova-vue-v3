; Script tags with an explicit language
(
  (script_element
    (start_tag
      (attribute
        (attribute_name) @_lang_attr
        (quoted_attribute_value
          ["\"" "'"]
          (attribute_value) @_lang_value
          ["\"" "'"]
        )
      )
    )
    (raw_text) @injection.content
  )
  (#match? @_lang_attr "(?i)^lang$")
  (#set-by-case-eq! @_lang_value injection.language
    "js" "javascript"
    "javascript" "javascript"
    "jsx" "jsx"
    "ts" "typescript"
    "typescript" "typescript"
    "tsx" "tsx"
    "coffee" "coffeescript"
  )
)

; Script tags without a lang attribute use JavaScript. Matching the complete
; start tag keeps this fallback disjoint from the explicit-language rule.
(
  (script_element
    (start_tag) @_start_tag
    (raw_text) @injection.content
  )
  (#not-match? @_start_tag "(?i)(^|\\s)lang\\s*=")
  (#set! injection.language "javascript")
)

; Pug template tags
(
  (template_element
    (start_tag
      (attribute
        (attribute_name) @_lang_attr
        (quoted_attribute_value
          ["\"" "'"]
          (attribute_value) @_lang_value
          ["\"" "'"]
        )
      )
    )
    (text) @injection.content
  )
  (#match? @_lang_attr "(?i)^lang$")
  (#set-by-case-eq! @_lang_value injection.language
    "pug" "pug"
  )
)

; Style tags with an explicit language
(
  (style_element
    (start_tag
      (attribute
        (attribute_name) @_lang_attr
        (quoted_attribute_value
          ["\"" "'"]
          (attribute_value) @_lang_value
          ["\"" "'"]
        )
      )
    )
    (raw_text) @injection.content
  )
  (#match? @_lang_attr "(?i)^lang$")
  (#set-by-case-eq! @_lang_value injection.language
    "css" "css"
    "scss" "css"
    "sass" "stylus"
    "less" "css"
    "postcss" "css"
    "pcss" "css"
    "stylus" "stylus"
    "styl" "stylus"
  )
)

; Style tags without a lang attribute use CSS.
(
  (style_element
    (start_tag) @_start_tag
    (raw_text) @injection.content
  )
  (#not-match? @_start_tag "(?i)(^|\\s)lang\\s*=")
  (#set! injection.language "css")
)

; Style attributes
(attribute
  (attribute_name) @_attrname
  (quoted_attribute_value
    (attribute_value) @injection.content
  )
  (#set! injection.language "css")
  (#set! injection.reset)
  (#match? @_attrname "(?i)^style$")
)

; Event handler attributes
(
  (start_tag
    (attribute
      (attribute_name) @name
      (quoted_attribute_value
        ["\"" "'"]
        (_) @injection.content
        ["\"" "'"]
      )
    )
  )
  (#match? @name "(?i)^on(abort|auxclick|beforematch|blur|cancel|canplay|canplaythrough|change|click|close|contextlost|contextmenu|contextrestored|copy|cuechange|cut|dblclick|drag|dragend|dragenter|dragleave|dragover|dragstart|drop|durationchange|emptied|ended|error|focus|formdata|input|invalid|keydown|keypress|keyup|load|loadeddata|loadedmetadata|loadstart|mousedown|mouseenter|mouseleave|mousemove|mouseout|mouseover|mouseup|paste|pause|play|playing|progress|ratechange|reset|resize|scroll|securitypolicyviolation|seeked|seeking|select|slotchange|stalled|submit|suspend|timeupdate|toggle|volumechange|waiting|webkitanimationend|webkitanimationiteration|webkitanimationstart|webkittransitionend|wheel)$")
  (#set! injection.language "javascript")
  (#set! injection.reset)
)

; Vue interpolation
(
  (interpolation
    (raw_text) @injection.content
  )
  (#set! injection.language "javascript")
)

; Vue directives
(directive_attribute
  [
    (attribute_value) @injection.content
    (quoted_attribute_value
      ["\"" "'"] @tag.attribute.value.delimiter.left
      (_)? @injection.content
      ["\"" "'"] @tag.attribute.value.delimiter.right
    )
  ]?
  (#set! injection.language "javascript")
)

; Vue loaders tags
(
  (element
    (start_tag (tag_name) @_name)
    (text)? @injection.content
  )
  (#set-by-case-eq! @_name injection.language
    "i18n" "json"
    "graphql" "graphql"
  )
)

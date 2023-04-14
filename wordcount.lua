-- counts words in a document
-- from https://pandoc.org/lua-filters.html#examples

words = 0

wordcount = {
  Str = function(el)
    -- we don't count a word if it's entirely punctuation:
    if el.text:match("%P") then
      words = words + 1
    end
  end
}

function Pandoc(el)
  -- skip metadata, just count body:
  pandoc.walk_block(pandoc.Div(el.blocks), wordcount)
  print(words .. " words in body")
  os.exit(0)
end

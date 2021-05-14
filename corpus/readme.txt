================================================================================
First example from README
================================================================================

build:
    cc *.c -o main

# test everything
test-all: build
    ./test --all

# run a specific test
test TEST: build
    ./test --test {{TEST}}

--------------------------------------------------------------------------------

(source_file
  (recipe
    (name)
    (body))
  (comment)
  (recipe
    (name)
    (dependency
      (name))
    (body))
  (comment)
  (recipe
    (name)
    (parameter
      (name))
    (dependency
      (name))
    (body
      (interpolation
        (expression
          (name))))))

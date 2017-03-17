# quickcheck - Node.js port of the QuickCheck unit test framework

Now compatible with [mocha](http://visionmedia.github.io/mocha/)!

# EXAMPLE

    $ npm test

    > quickcheck@0.0.3 test /Users/andrew/Desktop/src/node-quickcheck
    > mocha


      ․․․․

      4 passing (6ms)

# HOMEPAGE

[http://www.yellosoft.us/quickcheck](http://www.yellosoft.us/quickcheck)

# REQUIREMENTS

* [Node.js](http://nodejs.org/) 0.10+

## Optional

* [Ruby](https://www.ruby-lang.org/) 2+
* [Bundler](http://bundler.io/)
* [Cucumber](http://cukes.info/)
* [Guard](http://guardgem.org/)

# INSTALL

    $ npm install quickcheck

# LINT

Keep the code tidy:

    $ npm run-script lint

Guard can automatically lint when the code changes:

    $ bundle
    $ guard -G Guardfile-lint
    ...

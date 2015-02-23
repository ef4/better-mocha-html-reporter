This is a Mocha HTML reporter I use with Ember Mocha. It needs better
packaging. But if you want to try it out, place `reporter.js` in
`tests/helpers`, and add the following to your `tests/test-helper.js`:

````js
import Reporter from './helpers/reporter';
mocha.reporter(Reporter);
````

You may also want the accompanying stylesheet, which tweaks the
default one that ships with ember mocha.

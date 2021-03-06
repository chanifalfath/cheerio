var _ = require('underscore'),
    select = require('CSSselect'),
    utils = require('../utils'),
    isTag = utils.isTag;

var find = exports.find = function(selector) {
  // TODO: Remove the call to _.uniq when the underlying bug in CSSselect has
  // been resolved:
  // https://github.com/fb55/CSSselect/issues/12
  return this.make(_.uniq(select(selector, [].slice.call(this.children()))));
};

// Get the parent of each element in the current set of matched elements,
// optionally filtered by a selector.
var parent = exports.parent = function(selector) {
  var set = [];
  var $set;

  this.each(function(idx, elem) {
    var parentElem = elem.parent;
    if (set.indexOf(parentElem) < 0 && parentElem.type !== 'root') {
      set.push(parentElem);
    }
  });

  $set = this.make(set);

  if (arguments.length) {
    $set = $set.filter(selector);
  }

  return $set;
};

var parents = exports.parents = function(selector) {
  var parentNodes = [];

  // When multiple DOM elements are in the original set, the resulting set will
  // be in *reverse* order of the original elements as well, with duplicates
  // removed.
  this.toArray().reverse().forEach(function(elem) {
    traverseParents(this, elem.parent, selector, Infinity)
      .forEach(function(node) {
        if (parentNodes.indexOf(node) === -1) {
          parentNodes.push(node);
        }
      }
    );
  }, this);

  return this.make(parentNodes);
};

// For each element in the set, get the first element that matches the selector
// by testing the element itself and traversing up through its ancestors in the
// DOM tree.
var closest = exports.closest = function(selector) {
  var set = [];

  if (!selector) {
    return this.make(set);
  }

  this.each(function(idx, elem) {
    var closestElem = traverseParents(this, elem, selector, 1)[0];

    // Do not add duplicate elements to the set
    if (closestElem && set.indexOf(closestElem) < 0) {
      set.push(closestElem);
    }
  }.bind(this));

  return this.make(set);
};

var next = exports.next = function() {
  if (!this[0]) { return this; }
  var elem = this[0];
  while ((elem = elem.next)) if (isTag(elem)) return this.make(elem);
  return this.make([]);
};

var nextAll = exports.nextAll = function(selector) {
  if (!this[0]) { return this; }
  var elems = [], elem = this[0];
  while ((elem = elem.next)) if (isTag(elem)) elems.push(elem);
  return this.make(selector ? select(selector, elems) : elems);
};

var prev = exports.prev = function() {
  if (!this[0]) { return this; }
  var elem = this[0];
  while ((elem = elem.prev)) if (isTag(elem)) return this.make(elem);
  return this.make([]);
};

var prevAll = exports.prevAll = function(selector) {
  if (!this[0]) { return this; }
  var elems = [], elem = this[0];
  while ((elem = elem.prev)) if (isTag(elem)) elems.push(elem);
  return this.make(selector ? select(selector, elems) : elems);
};

var siblings = exports.siblings = function(selector) {
  var elems = _.filter(
    this.parent() ? this.parent().children() : this.siblingsAndMe(),
    function(elem) { return isTag(elem) && !this.is(elem); },
    this
  );
  if (selector !== undefined) {
    elems = this.make(select(selector, elems));
  }
  return this.make(elems);
};

var children = exports.children = function(selector) {

  var elems = _.reduce(this, function(memo, elem) {
    return memo.concat(_.filter(elem.children, isTag));
  }, []);

  if (selector === undefined) return this.make(elems);
  else if (_.isNumber(selector)) return this.make(elems[selector]);

  return this.make(elems).filter(selector);
};

var contents = exports.contents = function() {
  return this.make(_.reduce(this, function(all, elem) {
    all.push.apply(all, elem.children);
    return all;
  }, []));
};

var each = exports.each = function(fn) {
  var i = 0, len = this.length;
  while (i < len && fn.call(this.make(this[i]), i, this[i]) !== false) ++i;
  return this;
};

var map = exports.map = function(fn) {
  return this.make(_.reduce(this, function(memo, el, i) {
    var val = fn.call(el, i, el);
    return val == null ? memo : memo.concat(val);
  }, []));
};

var filter = exports.filter = function(match) {
  var make = _.bind(this.make, this);
  var filterFn;

  if (_.isString(match)) {
    filterFn = function(el) {
      return select(match, [el])[0] === el;
    };
  } else if (_.isFunction(match)) {
    filterFn = function(el, i) {
      return match.call(make(el), i, el);
    };
  } else if (match.cheerio) {
    filterFn = match.is.bind(match);
  } else {
    filterFn = function(el) {
      return match === el;
    };
  }

  return make(_.filter(this, filterFn));
};

var first = exports.first = function() {
  return this[0] ? this.make(this[0]) : this;
};

var last = exports.last = function() {
  return this[0] ? this.make(this[this.length - 1]) : this;
};

// Reduce the set of matched elements to the one at the specified index.
var eq = exports.eq = function(i) {
  i = +i;
  if (i < 0) i = this.length + i;
  return this[i] ? this.make(this[i]) : this.make([]);
};

var slice = exports.slice = function() {
  return this.make([].slice.apply(this, arguments));
};

function traverseParents(self, elem, selector, limit) {
  var elems = [];
  while (elems.length < limit && elem.type !== 'root') {
    if (!selector || self.make(elem).filter(selector).length) {
      elems.push(elem);
    }
    elem = elem.parent;
  }
  return elems;
}

// End the most recent filtering operation in the current chain and return the
// set of matched elements to its previous state.
var end = exports.end = function() {
  return this.prevObject || this.make([]);
};

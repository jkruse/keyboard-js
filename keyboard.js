/**
 * Keyboard.js - keyboard event handling interface
 *             - for danish keyboards only(!!)
 *             - tested on Win-IE7, Win-FF2, Win-FF3, Win-Safari3 and Mac-Safari3 only
 *             - works with either Prototype or jQuery
 *
 * Examples:
 *
 *   Keyboard.registerGlobal(KEY.CTRL + KEY.F, mySpecialFindFunction);
 *
 *     - or -
 *
 *   Keyboard.register('myDiv', KEY.CTRL + KEY.SHIFT + KEY.ESC, myFingerBreaker);
 *
 *     - or -
 *
 *   var handler = Keyboard.handlerFor('myMenu');
 *   handler.register(KEY.LEFT,  goLeft);
 *   handler.register(KEY.RIGHT, goRight);
 *   handler.register(KEY.UP,    goUp);
 *   handler.register(KEY.DOWN,  goDown);
 *
 *     - or, to force mapping a key that's known to cause problems -
 *
 *   Keyboard.registerGlobal(KEY.F1, myOwnHelpSystem, true);
 *
 * Notes:
 *
 *   Any element, to which keyboard event handlers are tied, will also be made
 *   focusable, so that the element will enter into the "accessibility hierarchy"
 *   of the page. With the examples above, both document.getElementById('myDiv').focus() and
 *   document.getElementById('myMenu').focus() would work as expected.
 *
 *   It is also possible to explicitly specify the context to be used when the
 *   event handler function is invoked (by default the context is the element
 *   on which the event handler is placed). To do this, instead of the function
 *   argument, send an array. First element should be the desired context object.
 *   Second element should be the function. Like this:
 *     handler.register(KEY.F4, [this, myDropDownHandler]);
 *
 * Known problems:
 *
 *   - non-input elements can not be focused in Safari
 *
 * For the real mess, see: http://unixpapa.com/js/key.html
 *
 * JSLint "Good Parts" validated - try to keep it that way.
 *
 * @author Jakob Kruse <kruse@kruse-net.dk>
 * @version 1.1
 */

/*jslint bitwise: false */

//= require <prototype>
/*global $A Element Event Prototype */
// - or -
//= require <jquery>
/*global jQuery */


var KEY = {
  BACKSPACE:     8,
  TAB:           9,
  ENTER:        13,
  BREAK:        19,
  CAPSLOCK:     20,
  ESC:          27,
  SPACE:        32,
  PAGEUP:       33,
  PAGEDOWN:     34,
  END:          35,
  HOME:         36,
  LEFT:         37,
  UP:           38,
  RIGHT:        39,
  DOWN:         40,
  INSERT:       45,
  DELETE:       46,
  ZERO:         48,
  ONE:          49,
  TWO:          50,
  THREE:        51,
  FOUR:         52,
  FIVE:         53,
  SIX:          54,
  SEVEN:        55,
  EIGHT:        56,
  NINE:         57,
  UMLAUT:       59,
  A:            65,
  B:            66,
  C:            67,
  D:            68,
  E:            69,
  F:            70,
  G:            71,
  H:            72,
  I:            73,
  J:            74,
  K:            75,
  L:            76,
  M:            77,
  N:            78,
  O:            79,
  P:            80,
  Q:            81,
  R:            82,
  S:            83,
  T:            84,
  U:            85,
  V:            86,
  W:            87,
  X:            88,
  Y:            89,
  Z:            90,
  NUMPAD0:      96,
  NUMPAD1:      97,
  NUMPAD2:      98,
  NUMPAD3:      99,
  NUMPAD4:     100,
  NUMPAD5:     101,
  NUMPAD6:     102,
  NUMPAD7:     103,
  NUMPAD8:     104,
  NUMPAD9:     105,
  MULTIPLY:    106,
  ADD:         107,
  SUBTRACT:    109,
  DECIMAL:     110,
  DIVIDE:      111,
  F1:          112,
  F2:          113,
  F3:          114,
  F4:          115,
  F5:          116,
  F6:          117,
  F7:          118,
  F8:          119,
  F9:          120,
  F10:         121,
  F11:         122,
  F12:         123,
  NUMLOCK:     144,
  SCROLL:      145,
  UMLAUT_2:    186, // don't use this, use KEY.UMLAUT !
  PLUS:        187,
  COMMA:       188,
  MINUS:       189,
  PERIOD:      190,
  APOSTROPHE:  191,
  AE:          192,
  ACCENT:      219,
  HALF:        220,
  AA:          221,
  OE:          222,
  ANGLE:       226,
  // Modifiers
  CTRL:        256,
  SHIFT:       512,
  ALT:        1024
};

var Keyboard = function () {
  var KEYMASK, KEYSHIFT, KEYCTRL, KEYALT, broken, safariTranslator, handlers, factory, lib;
  
  if (window.Prototype) {
    lib = {
      webkit: Prototype.Browser.WebKit,
      msie: Prototype.Browser.IE,
      stopEvent: Event.stop,
      onDomLoaded: document.observe.curry("dom:loaded"),
      eventTarget: Event.element,
      observe: Element.observe,
      each: function (enumerable, fn) {
        enumerable.each(fn);
      },
      setStyle: Element.setStyle,
      identify: Element.identify
    };
  } else if (window.jQuery) {
    lib = {
      webkit: jQuery.browser.safari,
      msie: jQuery.browser.msie,
      stopEvent: function (event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopped = true;
      },
      onDomLoaded: jQuery(document).ready,
      eventTarget: function (event) {
        return event.target;
      },
      observe: function (element, event, fn) {
        if (typeof element === 'string') {
          element = '#' + element;
        }
        jQuery(element).bind(event, fn);
      },
      each: function (enumerable, fn) {
        jQuery.each(enumerable, function (index, val) {
          fn(val, index);
        });
      },
      setStyle: function (element, style) {
        if (typeof element === 'string') {
          element = '#' + element;
        }
        return jQuery(element).css(style);
      },
      identify: function (element) {
        if (typeof element === 'string') {
          element = document.getElementById(element);
        }
        var id = element.id, self = arguments.callee;
        if (id) {
          return id;
        }
        do {
          id = 'anonymous_element_' + (self.counter += 1);
        } while (document.getElementById(id));
        element.id = id;
        return id;
      }
    };
    lib.identify.counter = 1;
  }
  
  KEYMASK  = 255;
  KEYSHIFT = 16;
  KEYCTRL  = 17;
  KEYALT   = 18;
  
  // Setup list of known unmappable keys
  broken = {};
  lib.each([
    //ctrl+tab, alt+tab
    { key: KEY.CTRL + KEY.TAB, name: "Ctrl+Tab", browsers: "Win-FF3, Win-IE7", does: "next tab" },
    { key: KEY.ALT + KEY.TAB, name: "Alt+Tab", browsers: "Win-all", does: "task switch" },
    //alt+enter
    { key: KEY.ALT + KEY.ENTER, name: "Alt+Enter", browsers: "Win-IE7", does: "full screen" },
    //break
    { key: KEY.BREAK, name: "Break", browsers: "Mac-all", does: "key doesn't exist on Mac" },
    { key: KEY.CTRL + KEY.BREAK, name: "Ctrl+Break", browsers: "Win-all, Mac-all", does: "nothing on Win, key doesn't exist on Mac" },
    { key: KEY.SHIFT + KEY.BREAK, name: "Shift+Break", browsers: "Mac-all", does: "key doesn't exist on Mac" },
    { key: KEY.ALT + KEY.BREAK, name: "Alt+Break", browsers: "Mac-all", does: "key doesn't exist on Mac" },
    //capslock
    { key: KEY.CAPSLOCK, name: "CapsLock", browsers: "all browsers" },
    { key: KEY.CTRL + KEY.CAPSLOCK, name: "Ctrl+CapsLock", browsers: "all browsers" },
    { key: KEY.SHIFT + KEY.CAPSLOCK, name: "Shift+CapsLock", browsers: "all browsers" },
    { key: KEY.ALT + KEY.CAPSLOCK, name: "Alt+CapsLock", browsers: "all browsers" },
    //ctrl+esc, alt+esc
    { key: KEY.CTRL + KEY.ESC, name: "Ctrl+Esc", browsers: "Win-all", does: "start menu" },
    { key: KEY.ALT + KEY.ESC, name: "Alt+Esc", browsers: "Win-all", does: "task switch" },
    //ctrl+space, alt+space
    { key: KEY.CTRL + KEY.SPACE, name: "Ctrl+Space", browsers: "Mac-all", does: "spotlight" },
    { key: KEY.ALT + KEY.SPACE, name: "Alt+Space", browsers: "Win-all", does: "system menu" },
    //ctrl+PAGEUP
    { key: KEY.CTRL + KEY.PAGEUP, name: "Ctrl+PAGEUP", browsers: "Win-FF3", does: "previous tab" },
    //ctrl+PAGEDOWN
    { key: KEY.CTRL + KEY.PAGEDOWN, name: "Ctrl+PAGEDOWN", browsers: "Win-FF3", does: "next tab" },
    //alt+home
    { key: KEY.ALT + KEY.HOME, name: "Alt+Home", browsers: "Win-IE7", does: "home page" },
    //alt+left
    { key: KEY.ALT + KEY.LEFT, name: "Alt+Left", browsers: "Win-Safari3", does: "history back" },
    //alt+right
    { key: KEY.ALT + KEY.RIGHT, name: "Alt+Right", browsers: "Win-Safari3", does: "history forward" },
    //0
    { key: KEY.CTRL + KEY.ZERO, name: "Ctrl+0", browsers: "Win-IE7, Win-Safari3", does: "reset zoom" },
    //umlaut
    { key: KEY.UMLAUT, name: "�", browsers: "Mac-Safari3" },
    { key: KEY.CTRL + KEY.UMLAUT, name: "Ctrl+�", browsers: "Mac-Safari3" },
    { key: KEY.SHIFT + KEY.UMLAUT, name: "Shift+�", browsers: "Mac-Safari3" },
    { key: KEY.ALT + KEY.UMLAUT, name: "Alt+�", browsers: "Mac-Safari3" },
    //alt+a
    { key: KEY.ALT + KEY.A, name: "Alt+A", browsers: "Win-IE7", does: "address bar" },
    //alt+b
    { key: KEY.ALT + KEY.B, name: "Alt+B", browsers: "Win-Safari3", does: "bookmarks" },
    //alt+d
    { key: KEY.ALT + KEY.D, name: "Alt+D", browsers: "Win-IE7, Win-Safari3", does: "address bar" },
    //alt+e
    { key: KEY.ALT + KEY.E, name: "Alt+E", browsers: "Win-Safari3", does: "edit menu" },
    //ctrl+f, alt+f
    { key: KEY.CTRL + KEY.F, name: "Ctrl+F", browsers: "Win-IE7, WIn-Safari3", does: "find" },
    { key: KEY.ALT + KEY.F, name: "Alt+F", browsers: "Win-Safari3", does: "file menu" },
    //alt+h
    { key: KEY.ALT + KEY.H, name: "Alt+H", browsers: "Win-Safari3", does: "help menu" },
    //alt+i
    { key: KEY.ALT + KEY.I, name: "Alt+I", browsers: "Win-Safari3", does: "history menu" },
    //ctrl+o
    { key: KEY.CTRL + KEY.O, name: "Ctrl+O", browsers: "Win-IE7, Win-Safari3", does: "open" },
    //ctrl+p
    { key: KEY.CTRL + KEY.P, name: "Ctrl+P", browsers: "Win-IE7, Win-Safari3", does: "print" },
    //alt+v
    { key: KEY.ALT + KEY.V, name: "Alt+V", browsers: "Win-Safari3", does: "view menu" },
    //alt+w
    { key: KEY.ALT + KEY.W, name: "Alt+W", browsers: "Win-Safari3", does: "window menu" },
    //shift+pad-digits
    { key: KEY.SHIFT + KEY.NUMPAD0, name: "Shift+Pad0", browsers: "all browsers" },
    { key: KEY.SHIFT + KEY.NUMPAD1, name: "Shift+Pad1", browsers: "all browsers" },
    { key: KEY.SHIFT + KEY.NUMPAD2, name: "Shift+Pad2", browsers: "all browsers" },
    { key: KEY.SHIFT + KEY.NUMPAD3, name: "Shift+Pad3", browsers: "all browsers" },
    { key: KEY.SHIFT + KEY.NUMPAD4, name: "Shift+Pad4", browsers: "all browsers" },
    { key: KEY.SHIFT + KEY.NUMPAD5, name: "Shift+Pad5", browsers: "all browsers" },
    { key: KEY.SHIFT + KEY.NUMPAD6, name: "Shift+Pad6", browsers: "all browsers" },
    { key: KEY.SHIFT + KEY.NUMPAD7, name: "Shift+Pad7", browsers: "all browsers" },
    { key: KEY.SHIFT + KEY.NUMPAD8, name: "Shift+Pad8", browsers: "all browsers" },
    { key: KEY.SHIFT + KEY.NUMPAD9, name: "Shift+Pad9", browsers: "all browsers" },
    //ctrl+pad+
    { key: KEY.CTRL + KEY.ADD, name: "Ctrl+Pad+", browsers: "Win-IE7", does: "zoom" },
    //ctrl+pad-
    { key: KEY.CTRL + KEY.SUBTRACT, name: "Ctrl+Pad-", browsers: "Win-IE7", does: "zoom" },
    //shift+pad-decimal
    { key: KEY.SHIFT + KEY.DECIMAL, name: "Shift+PadDecimal", browsers: "all browsers" },
    //f1, ctrl+f1, shift+f1
    { key: KEY.F1, name: "F1", browsers: "Win-IE7", does: "help" },
    { key: KEY.CTRL + KEY.F1, name: "Ctrl+F1", browsers: "Win-IE7, Mac-Safari3", does: "help on Windows, nothing on Mac" },
    { key: KEY.SHIFT + KEY.F1, name: "Shift+F1", browsers: "Win-IE7", does: "help" },
    //f3
    { key: KEY.CTRL + KEY.F3, name: "Ctrl+F3", browsers: "Mac-all", does: "finder" },
    //ctrl+f4, alt+f4
    { key: KEY.CTRL + KEY.F4, name: "Ctrl+F4", browsers: "Win-all", does: "close window" },
    { key: KEY.ALT + KEY.F4, name: "Alt+F4", browsers: "Win-all", does: "close browser" },
    //f5
    { key: KEY.F5, name: "F5", browsers: "Win-Safari3", does: "reload" },
    //alt+f6
    { key: KEY.ALT + KEY.F6, name: "Alt+F6", browsers: "Win-IE7, Win-Safari3" },
    //f8
    { key: KEY.CTRL + KEY.F8, name: "Ctrl+F8", browsers: "Mac-all", does: "time machine" },
    //f9
    { key: KEY.F9, name: "F9", browsers: "Mac-all", does: "exposé" },
    { key: KEY.SHIFT + KEY.F9, name: "Shift+F9", browsers: "Mac-all", does: "exposé" },
    //f10
    { key: KEY.F10, name: "F10", browsers: "Mac-all", does: "exposé" },
    { key: KEY.SHIFT + KEY.F10, name: "Shift+F10", browsers: "Win-Safari3, Mac-all", does: "context menu on Windows, exposé on Mac" },
    //f11
    { key: KEY.F11, name: "F11", browsers: "Mac-all", does: "exposé" },
    { key: KEY.SHIFT + KEY.F11, name: "Shift+F11", browsers: "Mac-all", does: "exposé" },
    //f12
    { key: KEY.F12, name: "F12", browsers: "Mac-all", does: "exposé" },
    { key: KEY.SHIFT + KEY.F12, name: "Shift+F12", browsers: "Mac-all", does: "exposé" },
    //numlock
    { key: KEY.NUMLOCK, name: "NumLock", browsers: "all browsers" },
    { key: KEY.CTRL + KEY.NUMLOCK, name: "Ctrl+NumLock", browsers: "all browsers" },
    { key: KEY.SHIFT + KEY.NUMLOCK, name: "Shift+NumLock", browsers: "all browsers" },
    { key: KEY.ALT + KEY.NUMLOCK, name: "Alt+NumLock", browsers: "all browsers" },
    //scrolllock
    { key: KEY.SCROLL, name: "ScrollLock", browsers: "all browsers" },
    { key: KEY.CTRL + KEY.SCROLL, name: "Ctrl+ScrollLock", browsers: "all browsers" },
    { key: KEY.SHIFT + KEY.SCROLL, name: "Shift+ScrollLock", browsers: "all browsers" },
    { key: KEY.ALT + KEY.SCROLL, name: "Alt+ScrollLock", browsers: "all browsers" },
    //plus
    { key: KEY.PLUS, name: "+", browsers: "Win-FF2, Win-FF3" },
    { key: KEY.CTRL + KEY.PLUS, name: "Ctrl++", browsers: "Win-FF2, Win-FF3, Win-IE7, Win-Safari3", does: "zoom in FF2, IE7 and Safari 3" },
    { key: KEY.SHIFT + KEY.PLUS, name: "Shift++", browsers: "Win-FF2, Win-FF3" },
    { key: KEY.ALT + KEY.PLUS, name: "Alt++", browsers: "Win-FF2, Win-FF3" },
    //minus
    { key: KEY.MINUS, name: "-", browsers: "Win-FF2, Win-FF3" },
    { key: KEY.CTRL + KEY.MINUS, name: "Ctrl+-", browsers: "Win-FF2, Win-FF3, Win-IE7, Win-Safari3", does: "zoom in IE7 and Safari 3" },
    { key: KEY.SHIFT + KEY.MINUS, name: "Shift+-", browsers: "Win-FF2, Win-FF3" },
    { key: KEY.ALT + KEY.MINUS, name: "Alt+-", browsers: "Win-FF2, Win-FF3" },
    //æ
    { key: KEY.ALT + KEY.AE, name: "Alt+Æ", browsers: "Win-IE7" },
    //accent
    { key: KEY.ACCENT, name: "´", browsers: "Mac-Safari3" },
    { key: KEY.CTRL + KEY.ACCENT, name: "Ctrl+´", browsers: "Mac-Safari3" },
    { key: KEY.SHIFT + KEY.ACCENT, name: "Shift+´", browsers: "Mac-Safari3" },
    { key: KEY.ALT + KEY.ACCENT, name: "Alt+´", browsers: "Mac-Safari3" },
    //half
    { key: KEY.HALF, name: "½", browsers: "Mac-Safari3" },
    { key: KEY.CTRL + KEY.HALF, name: "Ctrl+½", browsers: "Mac-Safari3" },
    { key: KEY.SHIFT + KEY.HALF, name: "Shift+½", browsers: "Mac-Safari3" },
    { key: KEY.ALT + KEY.HALF, name: "Alt+½", browsers: "Mac-Safari3" },
    //alt
    { key: KEY.ALT, name: "Alt", browsers: "IE7", does: "activate menu" }
  ], function (obj) {
    var text = obj.name + ' is unmappable in ' + obj.browsers;
    if (obj.does) {
      text += ' (' + obj.does + ')';
    }
    broken[obj.key] = text;
  });
  
  // Safari 3.1.2 for Mac always send keyCodes based on a US keyboard layout
  // Fortunately they have implemented DOM3 keyIdentifier
  // They did it wrong, but we can still use it to figure out which key was pressed
  // This is for Danish keyboard layout only - it WILL break on other layouts!
  safariTranslator = {
    "U+0022": KEY.TWO,
    "U+0026": KEY.SIX,
    "U+0027": KEY.APOSTROPHE,
    "U+0028": KEY.EIGHT,
    "U+0029": KEY.NINE,
    "U+002A": KEY.APOSTROPHE,
    "U+002F": KEY.SEVEN,
    "U+003A": KEY.PERIOD,
    "U+003B": KEY.COMMA,
    "U+003C": KEY.ANGLE,
    "U+003D": KEY.ZERO,
    "U+003E": KEY.ANGLE,
    "U+003F": KEY.PLUS,
    "U+00C5": KEY.AA,
    "U+00C6": KEY.AE,
    "U+00D8": KEY.OE,
    "U+00E5": KEY.AA,
    "U+00E6": KEY.AE,
    "U+00F8": KEY.OE,
    "U+20AC": KEY.FOUR
  };
  
  // This function detects all valid accesskeys in IE
  function isAccessKey(key, alt) {
    return (alt && (
      (key >= KEY.ZERO && key <= KEY.NINE) ||
      (key >= KEY.A    && key <= KEY.Z)
    ));
  }
  
  // The universal default keyboard event canceller function
  // This function will cancel the default action of all keys that we map
  function cancel(keys, event) {
    var key, handler;
    
    if (lib.webkit && event.keyIdentifier && safariTranslator[event.keyIdentifier]) {
      key = [safariTranslator[event.keyIdentifier], event.ctrlKey, event.shiftKey, event.altKey];
    } else {
      key = [event.keyCode, event.ctrlKey, event.shiftKey, event.altKey];
    }
    
    handler = keys[key];
    
    if (handler) {
      lib.stopEvent(event);
      
      // Kill default behaviour of F-keys in IE
      if (lib.msie && event.keyCode >= 112 && event.keyCode <= 123) {
        event.keyCode = 0;
      }
      
      // For Alt+<alfanumeric> in IE, move accesskey div to be onscreen, so there's no jumping
      if (lib.msie && isAccessKey(event.keyCode, event.altKey)) {
        lib.setStyle('__altkeyhandler_' + event.keyCode, {
          left: (document.body.parentNode.scrollLeft || document.body.scrollLeft) + 'px',
          top:  (document.body.parentNode.scrollTop  || document.body.scrollTop)  + 'px'
        });
      }
    }
  }
  
  // The universal keyboard event handler function
  function monitor(keys, event) {
    var key, handler;
        
    if (lib.webkit && event.keyIdentifier && safariTranslator[event.keyIdentifier]) {
      key = [safariTranslator[event.keyIdentifier], event.ctrlKey, event.shiftKey, event.altKey];
    } else {
      key = [event.keyCode, event.ctrlKey, event.shiftKey, event.altKey];
    }
    
    handler = keys[key];
    
    if (handler) {
      switch (typeof handler) {
      case 'function':
        // Call handler in context of event target
        handler.call(lib.eventTarget(event), event);
        break;
      case 'object':
        // Call handler in specified context
        handler[1].call(handler[0], event);
        break;
      }
      lib.stopEvent(event);
    }
  }
  
  // This function will setup 'element' for keyboard event monitoring, and return
  // an object that can be used to register keys and the methods they should call
  function makeHandler(element) {
    var keys, handler, target;
    
    if (typeof element === 'string') {
      element = document.getElementById(element);
    }
    target = (element === document) ? document.body : element;
    
    // Will contain key functions, keyed by 'keyspecs' (an array containing
    // keycode and ctrl, shift and alt boolean indicators)
    keys = {};
    
    // Setup the universal keyboard event handler function for this element
    lib.observe(element, 'keydown', function (event) {
      cancel(keys, event);
    });
    lib.observe(element, 'keyup', function (event) {
      monitor(keys, event);
    });
    
    // Make element focusable
    if (target.tabIndex === -1 || !target.tabIndex) {
      if (target.nodeName === "INPUT") {
        target.tabIndex = 0;
      } else {
        // This will remove tab-stop ability from non-input targets with tabindex="0",
        // but IE returns 0 for elements without tabindex, so we have to do it!
        target.tabIndex = -1;
      }
    }
    
    // The keyboard handler instance object
    handler = {
      register: function (key, method, override) {
        var keyCode  = key & KEYMASK,
            ctrlKey  = !!(key & KEY.CTRL),
            shiftKey = !!(key & KEY.SHIFT),
            altKey   = !!(key & KEY.ALT),
            index    = [keyCode, ctrlKey, shiftKey, altKey],
            target, div;
        
        // Check for broken keys
        override = override || false;
        if (broken[key] && !override) {
          alert(broken[key] + ".\nThis key mapping has been ignored.\nIf you really want to map this key, set the override parameter to true.");
          return;
        }
        
        // Handle Ctrl, Shift and Alt solitary mappings
        if (keyCode === 0) {
          switch (key) {
          case KEY.CTRL:
            index = [KEYCTRL, false, false, false];
            break;
          case KEY.SHIFT:
            index = [KEYSHIFT, false, false, false];
            break;
          case KEY.ALT:
            index = [KEYALT, false, false, false];
            break;
          }
        }
        
        if (keys[index]) {
          alert("Key " + index[0] + " (ctrl=" + index[1] + ", shift=" + index[2] + ", alt=" + index[3] + ") already mapped!");
          return;
        } else {
          keys[index] = method;
          
          // Special care for the 'umlaut' key which has different key codes in IE/Safari and Gecko
          if (index[0] === KEY.UMLAUT) {
            keys[[KEY.UMLAUT_2, index[1], index[2], index[3]]] = method;
          }
          
          // Make Alt+<alfanumeric> work in IE
          if (lib.msie) {
            target = (element === document) ? document.body : element;
            
            // 0-9 and A-Z
            if (isAccessKey(index[0], index[3])) {
              // We need an element with an accesskey to prevent default behaviour in IE
              div = document.createElement('div');
              div.id = '__altkeyhandler_' + index[0];
              div.accessKey = String.fromCharCode(index[0]);
              div.tabIndex = -1; // better make it focusable or accesskey will not work
              Element.setStyle(div, { // better make it invisible (note: visibility=hidden will not work)
                position: 'absolute',
                width: 0,
                height: 0,
                margin: 0,
                padding: 0,
                border: 0
              });
              target.appendChild(div);
            }
          }
        }
      },
      
      list: function () {
        console.log(keys);
      }
    };
    
    // Return the handler instance
    return handler;
  }
  
  // Will contain all keyboard handler instances, keyed by element id
  handlers = {};
  
  // The factory for retrieving keyboard handler instances
  factory = {
    handlerFor: function (element) {
      var id;
      id = (element !== document) ? lib.identify(element) : element; //maybe use nodename?
      if (!handlers[id]) {
        handlers[id] = makeHandler(element);
      }
      return handlers[id];
    },
    
    register: function (element, key, method, override) {
      if (!!(document && document.body)) {
        // Register key immediately
        var handler = this.handlerFor(element);
        handler.register(key, method, override);
      } else {
        // Defer key registration until dom is loaded
        document.observe("dom:loaded", function () {
          Keyboard.register(element, key, method, override);
        });
      }
    },
    
    registerGlobal: function (key, method, override) {
      this.register(document, key, method, override);
    }
  };
  
  // Return the factory object
  return factory;
}();

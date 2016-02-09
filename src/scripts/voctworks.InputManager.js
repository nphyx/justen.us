(function() {
	"use strict";
	const keyCodes = {
		"BREAK":3,
		"BACKSPACE":8,
		"TAB":9,
		"CLEAR":12,
		"ENTER":13,
		"SHIFT":16,
		"CTRL ":17,
		"ALT":18,
		"PAUSE":19,
		"CAPS":20,
		"ESC":27,
		"SPACE":32,
		"PAGEUP":33,
		"PAGEDOWN":34,
		"END":35,
		"HOME":36,
		"LEFT":37,
		"UP":38,
		"RIGHT":39,
		"DOWN":40,
		"SELECT":41,
		"FN_PRINT":42,
		"EXECUTE":43,
		"PRINT":44,
		"INSERT":45,
		"DELETE":46,
		"0":48,
		"1":49,
		"2":50,
		"3":51,
		"4":52,
		"5":53,
		"6":54,
		"7":55,
		"8":56,
		"9":57,
		"EQUALS":59,
		"FF_SEMICOLON":59,
		"<":60,
		"FF_EQUALS":61,
		"ß":63,
		"A":65,
		"B":66,
		"C":67,
		"D":68,
		"E":69,
		"F":70,
		"G":71,
		"H":72,
		"I":73,
		"J":74,
		"K":75,
		"L":76,
		"M":77,
		"N":78,
		"O":79,
		"P":80,
		"Q":81,
		"R":82,
		"S":83,
		"T":84,
		"U":85,
		"V":86,
		"W":87,
		"X":88,
		"Y":89,
		"Z":90,
		"SYSTEM_L":91,
		"SYSTEM_R_A":92,
		"SYSTEM_R_B":93,
		"NUM0":96,
		"NUM1":97,
		"NUM2":98,
		"NUM3":99,
		"NUM4":100,
		"NUM5":101,
		"NUM6":102,
		"NUM7":103,
		"NUM8":104,
		"NUM9":105,
		"MULTIPLY":106,
		"ADD":107,
		"NUMPERIOD":108,
		"MINUS":109,
		"DECIMAL_POINT":110,
		"DIVIDE":111,
		"F1":112,
		"F2":113,
		"F3":114,
		"F4":115,
		"F5":116,
		"F6":117,
		"F7":118,
		"F8":119,
		"F9":120,
		"F10":121,
		"F11":122,
		"F12":123,
		"F13":124,
		"F14":125,
		"F15":126,
		"F16":127,
		"F17":128,
		"F18":129,
		"F19":130,
		"NUMLOCK":144,
		"SCROLLLOCK":145,
		"^":160,
		"#":163,
		"FF_MINUS":173,
		"FN_MUTE":173,
		"FN_VOLUME_DOWN":174,
		"FN_VOLUME_UP":175,
		"FN_NEXT":176,
		"FN_PREVIOUS":177,
		"FN_STOP":178,
		"FN_PLAY":179,
		"FN_EMAIL":180,
		"FF_MUTE":181,
		"FF_VOLUME_DOWN":182,
		"FF_VOLUME_UP":183,
		"SEMICOLON":186,
		"EQUALS_SIGN":187,
		"COMMA":188,
		"DASH":189,
		"PERIOD":190,
		"SLASH_FORWARD":191,
		"GRAVE_ACCENT":192,
		"CHROME_NUMPERIOD":194,
		"BRACKET_OPEN":219,
		"SLASH_BACK":220,
		"BRACKET_CLOSE":221,
		"APOSTROPHE":222,
		"BACKTICK":223,
		"FF_SYSTEM":224,
		"ALTGR":225,
		"CARET_LEFT":226,
		"FN_COMPOSE":230,
		"FN_TOUCHPAD_TOGGLE":255
	};
	Object.freeze(keyCodes);

	/**
	 * Binds a callback to a key for eventSet
	 */
	function registerKey(eventSet, keyCode, callback) {
		if(typeof(eventSet[keyCode]) === "undefined") eventSet[keyCode] = [];
		else eventSet[keyCode].forEach((el) => { // only do this if it was already set obvs
			if(el === callback) {
				throw new Error("key+event pair is already bound for "+keyCode);
			}
		});
		eventSet[keyCode].push(callback);
	}

	/**
	 * Unbinds a callback for a key in eventSet if that callback was registered
	 */
	function unregisterKey(eventSet, keyCode, callback) {
		if(typeof(eventSet[keyCode]) !== "undefined")  {
			eventSet = eventSet[keyCode].filter((el) => el !== callback);
		}
	}

	function inputManagerFactory() {
		/** jshint unused:true **/
		let im = Object.create(Object);
		// with help from https://github.com/wesbos/keycodes/
		let currentKeys = [];
		let onUp = {};
		let onDown = {};
		let perFrame = {};
		let mouseMove = [];
		let enabled = true;

		/**
		 * each mousemove callback is called with x and y coords of mouse on each mousemove
		 * event
		 */
		function handleMouseMove(event) {
			let x = event.clientX;
			let y = event.clientY;
			mouseMove.forEach((cb) => cb(x, y));
		}

		function handleKeyDown(event) {
			currentKeys[event.keyCode] = true;
			if(enabled && (typeof(onDown[event.keyCode]) !== "undefined")) {
				onDown[event.keyCode].forEach((el) => el());
			}
		}

		function handleKeyUp(event) {
			currentKeys[event.keyCode] = false;
			if(enabled && (typeof(onUp[event.keyCode]) !== "undefined")) {
				onUp[event.keyCode].forEach((el) => el());
			}
		}

		function enable() {
			enabled = true;
		}

		/**
		 * Disables the InputManager. While disabled, it will ignore all events and do 
		 * nothing.
		 */
		function disable() {
			enabled = false;
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("keyup", handleKeyUp);
			window.removeEventListener("keydown", handleKeyDown);
		}

		/**
		 * Binds keys that should fire immediately upon key release
		 */
		im.onUp = registerKey.bind(im, onUp);

		/**
		 * Unbind an up key.
		 */
		im.offUp = unregisterKey.bind(im, onUp);

		/**
		 * Binds keys that should fire immediately upon key release
		 */
		im.onDown = registerKey.bind(im, onDown);

		/**
		 * Unbind a down key.
		 */
		im.offDown = unregisterKey.bind(im, onDown);

		/**
		 * Binds a continuous keypress event. Events bound this way will fire once each time 
		 * frame() is called.
		 */
		im.onFrame = registerKey.bind(im, perFrame);

		im.onMouseMove = function(cb) {
			if(mouseMove.indexOf(cb) === -1) mouseMove.push(cb);
		}

		im.offMouseMove = function(cb) {
			mouseMove.filter((el) => el !== cb);
		}

		/**
		 * Unbinds continuous events.
		 */
		im.offFrame = unregisterKey.bind(im, perFrame);

		/**
		 * Frame should be called on every frame.
		 */
		im.frame = function() {
			if(enabled) currentKeys.forEach((down, key) => {
				if(down && typeof(perFrame[key]) !== "undefined") {
					perFrame[key].forEach((el) => {
						el();
					});
				}
			});
		}

		im.getCurrentKeys = function() {
			return currentKeys.slice(0);
		}

		im.getOnDownKeys = function() {
			return Object.create(onDown);
		}

		im.getUpKeys = function() {
			return Object.create(onUp);
		}

		im.getFrameKeys = function() {
			return Object.create(perFrame);
		}

		/**
		 * Listen to keys. It always has to listen even when disabled, so that a keyup
		 * event can clear onFrame keys.
		 */
		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("keyup", handleKeyUp);
		window.addEventListener("keydown", handleKeyDown);

		Object.freeze(im);
		return im;
	}

	if(typeof("module") !== "undefined") {
		module.exports.factory = inputManagerFactory;
		module.exports.keyCodes = keyCodes;
	}
	else {
		const VoctworksInputManager = {
			factory:inputManagerFactory(),
			keyCodes:keyCodes
		};
		Object.freeze(VoctworksInputManager);
		return VoctworksInputManager;
	}
})();

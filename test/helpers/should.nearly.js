const should = require("should");
should.Assertion.add("nearly", function(arr, delta) {
	try {
		for(let i = 0, len = arr.length; i < len; i++) {
			this.obj[i].should.be.approximately(arr[i], delta);
		}
	}
	catch(e) {
		throw new Error("expected ["+this.obj.toString()+"] to be approximately ["+arr.toString()+"] ± "+delta);
	}
});


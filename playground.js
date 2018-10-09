const testFunc = function(obj) {
    const val = obj.name || obj;
    console.log(val);
};

myObj = {};
myObj.name = 'inside obj';
testFunc(myObj);
val = 'abc';
testFunc(val);
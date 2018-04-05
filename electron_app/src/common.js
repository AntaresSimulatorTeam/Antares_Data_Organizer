var exports = module.exports = {};

//inserts an   element after the refElem element
exports.insertAfter = function(elem, refElem) {
			var parent = refElem.parentNode
			var next = refElem.nextSibling
			if (next) {
				return parent.insertBefore(elem, next)
			} else {
				return parent.appendChild(elem)
			}
}

//return extension of  file
exports.getExt = function(filename){
	return filename.split('.').pop();
}


//Return a size in the proper unit and precision
exports.formatBytes = function(bytes,precision) {
   if(bytes == 0) return '0 Byte';
   var k = 1024; 
   var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
   var i = Math.floor(Math.log(bytes) / Math.log(k));
   return parseFloat((bytes / Math.pow(k, i)).toPrecision(precision)) + ' ' + sizes[i];
}


window.version = 'TO2.8'
window.urlParams = function (paramName) {
  var reg = new RegExp('[?&]' + paramName + '=([^&]*)[&]?', 'i')
  var paramVal = window.location.search.match(reg)
  if(paramVal == null) return ''
  var param = paramVal[1].replace(/%/g,'%25');
  return decodeURIComponent(param)
}

window.uuid = function() {
  var s = []
  var hexDigits = '0123456789abcdef'
  for (var i = 0; i < 36; i++) {
    s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1)
  }
  s[14] = '4' // bits 12-15 of the time_hi_and_version field to 0010
  s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1) // bits 6-7 of the clock_seq_hi_and_reserved to 01
  s[8] = s[13] = s[18] = s[23] = '-'
  var uuid = s.join('')
  return uuid
}


window.getUserInfo = function() {
  userInfo = localStorage.getItem('pro__Login_Userinfo')
  if(!userInfo){ return {};}
  userInfo = JSON.parse(userInfo).value
  return userInfo
}

window.getUserRole = function(){
  userRole = localStorage.getItem('pro__Login_UserRole')
  if(!userRole){return {};}
  userRole = JSON.parse(userRole).value
  return userRole
}

window.getUserToken = function() {
  if(!localStorage.getItem("pro__Access-Token")) return null;
  var token = JSON.parse(localStorage.getItem("pro__Access-Token"))
  return token==null?null:token.value
}

window.getSysConfig = function(key){
  if(localStorage.getItem("pro__SYS_CONFIG") && JSON.parse(localStorage.getItem("pro__SYS_CONFIG")).value){
    return JSON.parse(localStorage.getItem("pro__SYS_CONFIG")).value[key]
  }else{
    let config = null
    $.ajax({
      url: '/api/sys/config/getCurrentConfig',
      async: false,
      success: function(res){
        if(res.code == 0){
          config = res.result
          let configCache = {
            expire: new Date().getTime()+3600000,
            value: config
          }
          localStorage.setItem("pro__SYS_CONFIG", JSON.stringify(configCache))
        }
      }
    })
    return config
  }
}

window.getLogo = function(){
  if(getSysConfig('uploadType') == "qiniu"){
    return getSysConfig('qiniuDomain') + "/" + getSysConfig('logo')
  }else{
    return getSysConfig('staticDomain') + "/" + getSysConfig('logo')
  }
}

window.getWorkInfo = function(workId, cb) {
  $.ajax({
    url: '/api/teaching/teachingWork/studentWorkInfo',
    data: { workId: workId },
    success: function (res) {
      if (res.code == 0) {
        cb(res.result)
      }
    },
    error: function (e) {
    }
  })
}

//获取Scratch素材库  1背景 2声音 3造型 4角色
window.getScratchAssets = function(assetType, cb){
  let data;
  $.ajax({
    url: '/api/teaching/teachingScratchAssets/getScratchAssets?assetType='+assetType,
    beforeSend: function (request) {
      request.setRequestHeader('X-Access-Token', getUserToken())
    },
    async: cb!=undefined,
    success: function (res) {
      if(cb){
        cb(res)
      }else{
        data = res
      }
    },
  });
  return data
}

window.getQiniuToken = function(onSuccess, onError) {
  var qn_token;
  $.ajax({
    url: '/api/common/qiniu/getToken?t=' + new Date().getTime(),
    beforeSend: function(request) {
      request.setRequestHeader('X-Access-Token', getUserToken())
    },
    async: false,
    success: function(res) {
      if (res.code == 200) {
        qn_token = res.result
        if (onSuccess) {
          onSuccess(res)
        }
      } else {
        //alert(res.message)
      }
    },
    error: function(e) {
      if (onError) {
        onError(e)
      }
    }
  });
  return qn_token;
}


  //上传文件
  function uploadFile(fileName, fileTag, filePath, fileLocation) {
    var id = null;
    $.ajax({
      url: '/api/system/sysFile/add',
      type: 'POST',
      dataType: 'json',
      contentType: 'application/json',
      async: false,
      beforeSend: function (request) {
        request.setRequestHeader('X-Access-Token', getUserToken())
      },
      data: JSON.stringify({
        fileType: 2,
        fileName: fileName,
        filePath: filePath,
        fileLocation: fileLocation,
        fileTag: fileTag
      }),
      success: function (res) {
        if (res.success) {
          id = res.result.id
        }
      },
      error: function () {
      },
      complete: function () {
      }
    })
    return id;
  }

  function getUnitInfo(unitId, cb){
    $.ajax({
      url: '/api/teaching/teachingCourseUnit/getUnitWorkInfo',
      data: {
        unitId: unitId
      },
      beforeSend: function(request) {
        request.setRequestHeader('X-Access-Token', getUserToken())
      },
      success: function(res) {
        if (res.success) {
          cb(res.result)
        } else {
          alert("老师还没有上传作业文件")
        }
      },
      error: function(e) {
        if (e.responseJSON.status == 500) {}
      }
    })
  }

  
  function upload2Qiniu(file, key, fileName, observer) {
    var config = {
      useCdnDomain: true,
      region: qiniu.region[getSysConfig('qiniuArea')],
      disableStatisticsReport: true
    }
    var putExtra = {
      fname: fileName, //文件原名
      params: {},
      mimeType: null
    }
    var observable = qiniu.upload(file, key, qn_token, putExtra, config)
    var subscription = observable.subscribe(observer)
  }

  function update2Local(file,filename,bizPath, cb){
    let configDomain = ''
    try{
      const configCache = localStorage.getItem("CONFIG")
      if(configCache){
        const parsedConfig = JSON.parse(configCache)
        configDomain = parsedConfig && parsedConfig.domianURL ? parsedConfig.domianURL : ''
      }
    }catch (e) {
    }

    if(!configDomain){
      configDomain = getSysConfig('domianURL') || window.location.origin
    }

    let uploadApi = configDomain.replace(/\/+$/, '') + "/sys/common/upload"

    var formData = new FormData();
    formData.append("file",file, filename);
    formData.append("bizPath",bizPath);

    $.ajax({
      url: uploadApi,
      type: 'POST',
      cache: false,
      data: formData,
      processData: false,
      contentType: false,
      beforeSend: function(request) {
        request.setRequestHeader('X-Access-Token', getUserToken())
      },
      success: function (result) {
        if(cb){
          cb(result)
        }
      },
      error: function (err) {
        alert("文件上传失败")
      }
    })

  }

function joinResourceUrl(baseUrl, resourcePath) {
  var normalizedBaseUrl = String(baseUrl || '').replace(/\/+$/, '')
  var normalizedResourcePath = String(resourcePath || '').replace(/^\/+/, '')
  if (!normalizedBaseUrl) {
    return normalizedResourcePath ? '/' + normalizedResourcePath : ''
  }
  if (!normalizedResourcePath) {
    return normalizedBaseUrl
  }
  return normalizedBaseUrl + '/' + normalizedResourcePath
}

function extractResourceFileName(resourcePath) {
  var cleanPath = String(resourcePath || '').split(/[?#]/)[0]
  var parts = cleanPath.split(/[\\/]/)
  return parts[parts.length - 1] || ''
}

function extractResourceFileExtension(fileNameOrPath) {
  var fileName = extractResourceFileName(fileNameOrPath)
  if (!fileName || fileName.indexOf('.') === -1) {
    return ''
  }
  return fileName.split('.').pop().toLowerCase()
}

window.resolveUploadedFileInfo = function(source, options){
  options = options || {}

  var rawPath = ''
  var fullUrl = ''
  var fileName = options.fileName || ''
  var fileSize = Number(options.fileSize) || 0
  var storageType = ''

  if(typeof source === 'string'){
    rawPath = source
  }else if(source){
    if(source.result && source.result.path){
      rawPath = source.result.path
      fullUrl = source.result.fullUrl || ''
      storageType = source.result.storageType || ''
      fileName = source.result.filename || fileName
      fileSize = Number(source.result.size) || fileSize
    }else if(source.path){
      rawPath = source.path
      fullUrl = source.fullUrl || ''
      storageType = source.storageType || ''
      fileName = source.filename || fileName
      fileSize = Number(source.size) || fileSize
    }else if(source.key){
      rawPath = source.key
    }
  }

  rawPath = String(rawPath || '').trim()
  fullUrl = String(fullUrl || '').trim()

  var resolvedFileUrl = rawPath
  if (/^https?:\/\//i.test(rawPath)) {
    resolvedFileUrl = rawPath
  } else if (fullUrl && /^https?:\/\//i.test(fullUrl)) {
    resolvedFileUrl = fullUrl
  } else if (storageType === 'oss' && fullUrl) {
    resolvedFileUrl = fullUrl
  } else if (String(getSysConfig('uploadType') || '').toLowerCase() === 'qiniu') {
    resolvedFileUrl = joinResourceUrl(getSysConfig('qiniuDomain'), rawPath)
  } else if (rawPath.indexOf('/uploads/') === 0) {
    resolvedFileUrl = rawPath
  } else if (rawPath.indexOf('uploads/') === 0) {
    resolvedFileUrl = '/' + rawPath
  }

  if (!fileName) {
    fileName = decodeURIComponent(extractResourceFileName(resolvedFileUrl || rawPath) || '')
  }

  return {
    rawPath: rawPath,
    fileUrl: resolvedFileUrl,
    fullUrl: fullUrl || resolvedFileUrl,
    fileName: fileName,
    fileExtension: extractResourceFileExtension(fileName || resolvedFileUrl || rawPath),
    fileSize: fileSize
  }
}

window.upsertStudentWork = function (options) {
  options = options || {}

  var workId = String(options.workId || '').trim()
  var payload = {
    workName: options.workName,
    workDescription: options.workDescription || '',
    workType: options.workType,
    workFileUrl: options.workFileUrl,
    workFileName: options.workFileName || '',
    workFileSize: Number(options.workFileSize) || 0,
    workFileExtension: options.workFileExtension || '',
    workCoverUrl: options.workCoverUrl || '',
    workTags: Array.isArray(options.workTags) ? options.workTags : [],
    isPublic: !!options.isPublic
  }

  var requestUrl = '/api/teaching/student/works/upload'
  var requestMethod = 'POST'

  if (workId) {
    requestUrl = '/api/teaching/student/works/' + encodeURIComponent(workId)
    requestMethod = 'PUT'
  }

  $.ajax({
    url: requestUrl,
    type: requestMethod,
    dataType: 'json',
    contentType: 'application/json',
    beforeSend: function (request) {
      request.setRequestHeader('X-Access-Token', getUserToken())
    },
    data: JSON.stringify(payload),
    success: function (res) {
      if (res && res.success) {
        if (options.onSuccess) {
          options.onSuccess(res, workId ? 'update' : 'create')
        }
        return
      }

      if (options.onError) {
        options.onError(res || { message: '作品保存失败' })
      }
    },
    error: function (xhr) {
      if (options.onError) {
        options.onError((xhr && xhr.responseJSON) || { message: '作品保存失败' })
      }
    },
    complete: function () {
      if (options.onComplete) {
        options.onComplete()
      }
    }
  })
}

function createCode(id, src) {
  $('#' + id).html('')
  var qrcode = new QRCode(document.getElementById(id), {
    width: 250,
    height: 250
  })
  qrcode.makeCode(src)
}

function dataURLtoBlob(dataurl) {
  var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
  while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

function getFileAccessHttpUrl(avatar,subStr) {
  if(!subStr) subStr = 'http'
  if(avatar && avatar.startsWith(subStr)){
    return avatar;
  }else{
    if(avatar &&　avatar.length>0 && avatar.indexOf('[')==-1){
      if(getSysConfig('uploadType') == "qiniu"){
        return getSysConfig('qiniuDomain') + '/' + avatar;
      }else{
        return getSysConfig('staticDomain') + '/' + avatar;
      }
    }
  }
}

//请求全屏
window.launchIntoFullscreen = function(element) {
  if (element.requestFullscreen) {
    element.requestFullscreen();
  } else if (element.mozRequestFullScreen) {
    element.mozRequestFullScreen();
  } else if (element.webkitRequestFullscreen) {
    element.webkitRequestFullscreen();
  } else if (element.msRequestFullscreen) {
    element.msRequestFullscreen();
  }
}

//退出全屏
window.exitFullscreen = function() {
  if (window.document.exitFullscreen) {
    window.document.exitFullscreen();
  } else if (document.mozCancelFullScreen) {
    window.document.mozCancelFullScreen();
  } else if (document.webkitExitFullscreen) {
    window.document.webkitExitFullscreen();
  }
}

//是否全屏
window.isFullscreen = function(){
  return document.fullscreenElement    ||
         document.msFullscreenElement  ||
         document.mozFullScreenElement ||
         document.webkitFullscreenElement || false;
}


//index.js
const baseUrl = require('../../config').baseUrl
const checkUrl = require('../../config').checkUrl
const forumUrl = require('../../config').forumUrl
const joinClassUrl = require('../../config').joinClassUrl
const forumindexUrl = require('../../config').forumindexUrl
const loginUrl = require('../../config').loginUrl
const util = require('../../utils/util.js')
const datacheck = require('../../utils/datacheck.js')
const io = require('../../utils/weapp.socket.io.js')
var event = require('../../utils/event.js')
var recordTimeInterval
var socket
const app = getApp()
var self;

Page({
  data: {
      baseUrl: baseUrl,
    isLoading: false,
    shareHidden: true,
    tipStr: null,
    stateInfo: {},
    grouplist: [],
    groupTotal: 0,
    currentAudio: '',
    nickname: '',
    navData: [{
      name: '首页',
      icon:  'https://mc.wpnicer.com/source/plugin/mobile/template/image/xiaochengxu/minimg/logo.png',
      fid: 0,
      page: 1,
      index: 0
    }, ],
    myFid: [],
    currentTab: 0,
    navScrollLeft: 0,
    indexPosition: 30,
    currentVideo: '',
    tempFid: null,
    isLoading: false,
    scrollTop: 0,
    isTouch: false,
    refreshMsg: "松开刷新",
  },

  onReady() {
    this.videoContext = wx.createVideoContext('myVideo')
  },

  onUnload: function() {
    event.remove('indexChanged', this);
    socket = null
    wx.setKeepScreenOn({
      keepScreenOn: false
    });
  },

  onLoad: function(options) {
    self = this;

    self.setupEvent()
    self.shareManage(options)
    // self.getCurrentMessage()
    self.setupAudioPlayer()

    wx.showLoading();
    self.initRequest();

    wx.getSystemInfo({
      success: (res) => {
        this.setData({
          pixelRatio: res.pixelRatio,
          windowHeight: res.windowHeight,
          windowWidth: res.windowWidth,
          platform: res.platform
        })
      },
    })
  },

  setupEvent() {
    event.on('indexChanged', this, function(data) {
      if (data.name) {
        if (data.name == 'enter') {
          self.enterClass(data.fid)
        } else if (data.name == 'workRefresh') {
          self.getCurrentWorkList().workListRequest(0, true)
          if (data.reply == true) {
            setTimeout(function() {
              wx.navigateTo({
                url: '../thread_detail/thread_detail?tid=' + data.tid,
              })
            }, 300)

          }
        } else if (data.name == 'detail') {
          if (data.join) {
            self.data.tempFid = data.fid
            self.myClassRequest()
          } else if (self.data.navData[self.data.currentTab].fid != data.fid) {
            self.enterClass(data.fid)
          }
        } else {
          if (data.name == 'createClass') {
            self.data.isCreateClass = true
          }
          self.data.tempFid = data.fid
          self.myClassRequest()
        }
      } else if (data.fid) { // 圈子的处理都传fid就行 增加或删除、修改资料
        self.data.tempFid = data.fid
        self.myClassRequest()
      }
    })
  },

  shareManage(options) {
    // sharetype = work & shareid=
    if (options.shareid) {
      if (options.sharetype == 'work') {
        wx.navigateTo({
          url: '../thread_detail/thread_detail?type=share&tid=' + options.shareid,
        })
      }
      if (options.sharetype == 'joinclass') {
        let title = decodeURIComponent(options.title)
        let content = decodeURIComponent(options.content)
        let myFidArr = self.data.myFid
        if (myFidArr && myFidArr.length > 0) {
          for (let key in myFidArr) {
            let myfid = myFidArr[key]
            if (myfid == options.shareid) {
              self.data.tempFid = myfid
              return
            }
          }
        }
        if (!content) {
          content = "该圈子没有圈子介绍哦，赶紧点击下方“加入圈子”加入进去看看吧..."
        }
        wx.showModal({
          title: title,
          content: content,
          showCancel: false,
          confirmText: '加入圈子',
          success: function(res) {
            if (res.confirm) {
              self.joinClassRequest(options.shareid)
            }
          },
        })
      }
    }
  },

  getCurrentWorkList() {
    var componentID = "#worklist" + self.data.currentTab
    return this.selectComponent(componentID)
  },

  getCurrentMessage() { // 获取站点实时信息，有延迟
    socket = io(baseUrl, {
      path: '/socket/socket.io'
    });
    socket.on('message', function(data) {
      var stateInfo = self.data.stateInfo;
      var tip;
      if (data.type == 'createclass') {
        tip = data.username + "刚刚创建了一个" + data.name + "圈子"
        stateInfo.totalforums += 1
      } else if (data.type == 'newuser') {
        tip = data.username + '刚刚已成功注册'
        stateInfo.totalmembers += 1
      }
      self.setData({
        tipStr: tip,
        stateInfo: stateInfo
      })
    });
  },

  initRequest() {
    self.checkRequest()
    self.forumListRequest()
    self.myClassRequest()
  },

  switchNav(event) {
    var cur = event.currentTarget.dataset.current
    if (cur == 0 && self.data.currentTab == 0) {
      wx.navigateTo({
        url: '../mine/mine'
      })
      return
    }

    if (this.data.currentTab != cur) {
      this.setData({
        currentTab: cur
      })
    }       

  },

  switchTab(event) {

    var cur = event.detail.current;
    var total = self.data.navData.length
    var singleNavWidth = this.data.windowWidth / 5;
    var navScrollLeft = (cur - 2) * singleNavWidth
    let screenW = 750
    let perW = screenW / 5
    var temp = 0
    if (navScrollLeft > 0) {
      temp = (cur - 2) * perW
    }
    var allWidth = perW * (cur + 0.5)
    var indexPosition = allWidth - temp - 40
    if (cur >= total - 2 && total > 3) {
      indexPosition = screenW - (total - cur + 0.5) * perW - 40
    } else if (cur == 0) {
      indexPosition = 30
    }

    if ("touch" === event.detail.source) {
      this.setData({
        currentTab: cur,
      })
    }
    this.setData({
      indexPosition: indexPosition,
      navScrollLeft: navScrollLeft
    })
    if (cur == 0) {
      wx.setNavigationBarTitle({
        title: '首页'
      })
    } else {
      wx.setNavigationBarTitle({
        title: '圈子'
      })
      self.getCurrentWorkList().switchTabTo()
    }

    self.refreshHeaderHidden()
  },

  /* ****** 下拉刷新 ****** */
  refreshHeaderHidden() {
    self.setData({
      isLoading: false,
      scrollTop: 0
    })
  },

  touchStart(e) {
    self.data.isTouch = true
    if (!self.data.isLoading) {
      self.setData({
        refreshMsg: "松开刷新"
      })
    }
  },

  touchMove(e) {
    let offsetTop = e.target.offsetTop
    if (offsetTop < 300) {
      self.setData({
        scrollTop: -60 - 5
      })
    }
  },

  touchEnd(e) {
    self.data.isTouch = false
    if (self.data.scrollTop < -60) {
      self.setData({
        isLoading: true,
        refreshMsg: "正在刷新"
      })
      self.data.navData[self.data.currentTab].page = 1
      if (self.data.currentTab == 0) { // 圈子
        self.forumListRequest()
        self.checkRequest()
        self.myClassRequest()
      }
    }
  },

  /* ****** 上拉加载 ****** */
  lower(e) {
    self.data.navData[self.data.currentTab].page += 1
    if (self.data.currentTab == 0) { // 圈子
      if (self.data.grouplist.length < self.data.groupTotal) {
        self.forumListRequest()
      }
    }
  },

  enterClass(fid) {
    for (let i = 0; i < self.data.navData.length; i++) {
      if (self.data.navData[i].fid == fid) {
        let cur = i;
        if (this.data.currentTab != cur) {
          this.setData({
            currentTab: cur
          })
        }
      }
    }
  },

  groupClick(e) {
    const id = e.currentTarget.id
    var grouplist = self.data.grouplist;
    let classItem = grouplist[id];
    if (classItem.ingroup == 1) { // 已加入
      self.joinClass(e)
    }
  },

  joinClass(e) {
    const id = e.currentTarget.id
    var grouplist = self.data.grouplist;
    let classItem = grouplist[id];
    if (classItem.ingroup == 1) { // 已加入
      let myFidArr = self.data.myFid
      if (myFidArr && myFidArr.length > 0) {
        if (myFidArr.indexOf(classItem.fid) <= -1) { // 进入圈子时，没有在导航栏显示的，要加入进去
          myFidArr.push(classItem.fid)
          self.setData({
            myFid: myFidArr
          })
          let navData = self.data.navData
          navData.push(classItem)
          self.setData({
            navData: navData
          })
        }
      }
      self.enterClass(classItem.fid)
    } else {
      self.joinClassRequest(classItem.fid, classItem)
    }
  },

  joinClassRequest(fid, classItem) {
    var data = {
      fid: fid
    }
    app.apimanager.getRequest(joinClassUrl, data).then(res => {
      if (res.Message.messageval == "group_join_succeed") {
        if (classItem) {
          classItem.ingroup = 1
          var navData = self.data.navData
          var grouplist = self.data.grouplist;
          navData.push(classItem)
          self.setData({
            grouplist: grouplist,
            navData: navData
          })
          self.enterClass(classItem.fid)
        } else {
          self.data.tempFid = fid
          self.myClassRequest()
        }
        wx.showToast({
          title: res.Message.messagestr,
          icon: 'none'
        })
        let myFidArr = self.data.myFid
        if (myFidArr && myFidArr.length > 0) {
          if (myFidArr.indexOf(fid) <= -1) {
            myFidArr.push(fid)
            self.setData({
              myFid: myFidArr
            })
          }
        }
      } else {
        if (res.Message.messageval == "group_has_joined") {
          wx.showModal({
            content: '你已申请加入圈子，请等待审核',
            showCancel: false,
            confirmText: '知道了'
          })
          self.enterClass(fid)
        } else {
          wx.showModal({
            content: res.Message.messagestr,
            showCancel: false,
            confirmText: '知道了'
          })
        }
      }
    }).catch(res => {})
  },

  checkRequest() {
    app.apimanager.getRequest(checkUrl).then(res => {
      self.setData({
        stateInfo: res
      })
    }).catch(res => {})
  },
  myClassRequest() {
    var data = {
      mod: "my"
    }
    var indexItem = self.data.navData[0];
    app.apimanager.getRequest(forumUrl, data).then(res => {
      var grouplist = res.Variables.grouplist
      grouplist.unshift(indexItem)

      var myFidArr = []
      for (let index in grouplist) {
        let classItem = grouplist[index]
        classItem.index = index
        myFidArr.push(classItem.fid)
        self.setData({
          myFid: myFidArr
        })
      }
      // onshow 后请求会清空数据，同步一下当前页数据
      if (self.data.navData.length > 1 &&
        self.data.currentTab != 0 &&
        self.data.navData.length == grouplist.length) { // 普通的刷新
        for (let index in grouplist) {
          let classItem = grouplist[index]
          if (classItem.fid == self.data.navData[self.data.currentTab].fid) {
            classItem.data = self.data.navData[self.data.currentTab].data
            classItem.datalist = self.data.navData[self.data.currentTab].datalist
          }
        }
        self.setData({
          navData: grouplist
        })
        self.data.navData[self.data.currentTab].page = 1
        self.getCurrentWorkList().workListRequest(0, true)
      } else {
        if (self.data.navData.length > grouplist.length) { // 删除圈子去首页
          self.enterClass(0)
          self.setData({
            navData: grouplist
          })
          self.data.navData[0].page = 1
          self.forumListRequest()
        } else if (grouplist.length > self.data.navData.length) { // 第一次获取或者增加圈子
          if (self.data.tempFid) { // 增加圈子
            self.setData({
              navData: grouplist
            })
            self.enterClass(self.data.tempFid)
            self.data.tempFid = null
            self.getCurrentWorkList().workListRequest(0, true)
            if (self.data.isCreateClass) {
              self.setData({
                shareHidden: false
              })
              self.data.isCreateClass = false
            }
          } else { // 第一次设置导航
            self.setData({
              navData: grouplist
            })
          }
        }
      }
    }).catch(res => {})
  },

  forumListRequest() {
    let data = {
      page: self.data.navData[self.data.currentTab].page
    }
    app.apimanager.getRequest(forumUrl, data).then(res => {
      wx.hideLoading();
      self.refreshHeaderHidden()
      self.data.groupTotal = res.Variables.total
      var nickname = res.Variables.member_nickname ? res.Variables.member_nickname : res.Variables.member_username
      self.setData({
        nickname: nickname
      })
      var arr1 = res.Variables.grouplist;
      if (self.data.navData[self.data.currentTab].page > 1) {
        arr1 = self.data.grouplist.concat(arr1);
      }
      self.setData({
        grouplist: arr1
      })
      let noMore = arr1.length >= self.data.groupTotal ? true : false
      var pa = {}
      var nostr = "navData[" + self.data.currentTab + "].noMore"
      pa[nostr] = noMore
      self.setData(pa)

    }).catch(res => {
      wx.hideLoading();
      self.refreshHeaderHidden()
    })
  },
  // 播放视频 -------------------
  clickVideo(e) {
    console.log(e.detail)
    self.setData({
      currentVideo: e.detail
    })
    self.videoContext.requestFullScreen({
      direction: 0
    })
  },

  fullScreenChange(e) {
    if (!e.detail.fullScreen) {
      self.videoContext.stop()
    }
  },

  /* ******* 播放语音相关start ****** */
  setupAudioPlayer() {
    self.innerAudioContext = wx.createInnerAudioContext();
    self.innerAudioContext.obeyMuteSwitch = false;
    self.innerAudioContext.onEnded((res) => {
      self.stopVoice(true)
    })

    this.innerAudioContext.onTimeUpdate(() => {
      // 调用组件方法，获取数据
      var toolUse = self.getCurrentWorkList().currentVoiceUse()
      if (!toolUse) {
        return
      }
      var is_moving_slider = self.getCurrentWorkList().is_moving_slider()

      if (!is_moving_slider) { // 播放中
        toolUse['current_process'] = util.formatTime(
          self.innerAudioContext.currentTime)
        toolUse['slider_value'] = Math.floor(
          self.innerAudioContext.currentTime)
        toolUse['slider_max'] = Math.floor(
          self.innerAudioContext.duration)
        // 调用组件方法，更新组件
        self.getCurrentWorkList().voiceDataUpdate(toolUse)
      }
    })
  },
  // 拖动进度条控件
  seekCurrentAudio(e) {
    self.innerAudioContext.seek(e.detail)
  },
  // 点击播放暂停
  audio_play(e) {
    // 调用组件方法
    var isplay = e.detail.isplay
    var is_ended = e.detail.is_ended
    if (isplay) {
      this.innerAudioContext.pause()
      isplay = false
    } else if (!isplay && !is_ended) {
      this.playVoice(e.detail.src)
    } else {
      this.innerAudioContext.play()
    }
  },
  playVoice(src) {
    this.innerAudioContext.src = src
    this.innerAudioContext.play()
  },

  stopVoice(isPage) {
    if (isPage) {
      self.getCurrentWorkList().voiceReset()
    }
    this.innerAudioContext.stop()
  },
  /* *********************** 语音end *********** */
  closeShareMask() {
    self.setData({
      shareHidden: true
    })
  },
  /**
   * 分享
   */
  onShareAppMessage: function(res) {
    self.setData({
      shareHidden: true
    })
    var title = "站长之家论坛";
    var imagePath = "https://mc.wpnicer.com/source/plugin/mobile/template/image/xiaochengxu/minimg/kehoushare.png"
    var path = '/pages/index/index'

    if (self.data.currentTab > 0) {
      var dataSource = self.getCurrentWorkList().getDataSource()

      if (res.from === 'button') {
        // 来自页面内转发按钮
        if (res.target.id == 'joinclass') {
          let content = encodeURIComponent(dataSource.dataDic.Variables.forum.description)
          let usetitle = encodeURIComponent(dataSource.dataDic.Variables.forum.name)
          title = self.data.nickname + "同学创建了一个" + dataSource.dataDic.Variables.forum.name + "的圈子，快快去加入讨论吧！"
          path = "/pages/index/index?sharetype=joinclass&shareid=" + dataSource.dataDic.Variables.forum.fid + "&title=" + usetitle + "&content=" + content
          if (self.data.navData[self.data.currentTab].iconnew > 0) {
            imagePath = self.data.navData[self.data.currentTab].icon
          } else {
            imagePath = "https://mc.wpnicer.com/source/plugin/mobile/template/image/xiaochengxu/minimg/shareClassIcon.png"
          }
        } else if (res.target.dataset.sharetype == 'work') {
          let postItem = dataSource.datalist[res.target.id]
          console.log(postItem)
          let defaultTitle = self.data.nickname + "邀请你参与圈子话题交流，快快加入讨论吧"
          title = postItem.subject ? postItem.subject : postItem.message ? postItem.message : defaultTitle
          path = "/pages/index/index?sharetype=work&shareid=" + postItem.tid
          if (postItem.imageA && postItem.imageA.length > 0) {
            imagePath = postItem.imageA[0].attachment
          } else {
            imagePath = "https://mc.wpnicer.com/source/plugin/mobile/template/image/xiaochengxu/minimg/shareWorkIcon.png"
          }
        }
      }
    }
    return {
      title: title,
      path: path,
      imageUrl: imagePath,
    }
  },

  postEnter() {
    wx.navigateTo({
      url: '../post_thread/post_thread?fid=' + self.data.navData[self.data.currentTab].fid + '&is_quan=true',
    })
  },

  addClass() {
    wx.navigateTo({
      url: '../search_class/search_class',
    })
  },
})
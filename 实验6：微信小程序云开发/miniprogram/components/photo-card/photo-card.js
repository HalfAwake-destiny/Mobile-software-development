// components/photo-card/photo-card.js
Component({
  options: {
    multipleSlots: true,
    // 允许 app.wxss 里的 .ha-card 全局卡片样式作用到组件内部
    styleIsolation: "apply-shared",
  },
  properties: {
    photo: { type: Object, value: {} },
    showUploader: { type: Boolean, value: true },
  },
  methods: {
    onTapImage() {
      this.triggerEvent("tapimage", { id: this.data.photo._id });
    },
    onTapAvatar() {
      // ownerId = 上传者的账号（users._id）；openid 只是设备级身份，
      // 同一台设备切换手机号账号时 openid 不变，判断"是不是别人"必须用 ownerId
      this.triggerEvent("tapavatar", {
        openid: this.data.photo._openid,
        ownerId: this.data.photo.ownerId,
      });
    },
  },
});

<template>
  <div :class="disabled?'jeecg-form-container-disabled':''">
    <fieldset :disabled="disabled">
      <slot name="detail"></slot>
    </fieldset>
    <slot name="edit"></slot>
    <fieldset disabled>
      <slot></slot>
    </fieldset>
  </div>
</template>

<script>
/**
   * 使用方法
   * 在form下直接写这个组件就行了，
   *<a-form layout="inline" :form="form" >
   *     <j-form-container :disabled="true">
   *         <!-- 表单内容省略..... -->
   *     </j-form-container>
   *</a-form>
   */
export default {
    name: 'JFormContainer',
    props: {
        disabled: {
            type: Boolean,
            default: false,
            required: false
        }
    },
    mounted () {
    }
}
</script>
<style>
  .jeecg-form-container-disabled{
    cursor: not-allowed;
  }
  .jeecg-form-container-disabled fieldset[disabled] {
    -ms-pointer-events: none;
    pointer-events: none;
  }
  .jeecg-form-container-disabled .ant-select{
    -ms-pointer-events: none;
    pointer-events: none;
  }

  .jeecg-form-container-disabled .ant-upload-select{display:none}
  .jeecg-form-container-disabled .ant-upload-list{cursor:grabbing}
  .jeecg-form-container-disabled fieldset[disabled] .ant-upload-list{
    -ms-pointer-events: auto !important;
    pointer-events: auto !important;
  }

  .jeecg-form-container-disabled .ant-upload-list-item-actions .anticon-delete,
  .jeecg-form-container-disabled .ant-upload-list-item .anticon-close{
    display: none;
  }
</style>

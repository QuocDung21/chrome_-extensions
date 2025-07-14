<template>
  <ms-dynamic-popup
    :maximum="true"
    :esc-to-close="escToClose"
    :title="'Nhận dự toán  ' + (model.ref_no != null ? model.ref_no : '')"
    classTitle="budget-plan-receipt-detail"
    @beforeOpen="beforeOpen($event, close)"
    @beforeClose="beforeClose"
    classDetail="plan-with-draw-detail"
    class="bu-plan-receipt-detail"
    @shortkeyAction="shortkeyAction"
  >
    <template v-slot:icon>
      <ms-button
        text="Hướng dẫn"
        type="icon-button"
        class="btn-guide step-1"
        leftIcon="ic-guide"
        @click="guide"
        tooltipIconLeft="Hướng dẫn chức năng"
      />
      <ms-button
        text="Phím tắt"
        tooltipIconLeft="Phím tắt"
        type="icon-button"
        class="btn-guide step-2"
        leftIcon="ic-shortkey"
        @click="clickShortkeyBtn"
      />
      <div
        class="button icon24 setting-small mr-2 step-3"
        v-tooltip="'Tùy chỉnh giao diện'"
        shortkey-target="ConfigLayout"
        @click="clickSettingLayout"
      ></div>
      <div class="button icon24 email mr-2" v-tooltip="'Email'"></div>
      <a target="_blank" :href="linkHelp($ms.constant.Help.BUPlanReceipt)">
        <div class="button icon24 ic-question mr-2 step-4" v-tooltip="'Trợ giúp'" shortkey-target="Help"></div>
      </a>
    </template>
    <template v-slot:content>
      <div class="h-100 flex-column popup-container">
        <div class="tab-container">
          <div class="control-group-header flex-row">
            <div class="flex-row step-5">
              <label class="label mr-2" title="Hình thức nhận dự toán">Hình thức nhận dự toán</label>
              <ms-radio
                label="Đầu năm"
                name="rdname"
                :keyValue="51"
                class="mr-4"
                v-model="model.ref_type"
                :disabled="viewing"
                @msChange="changeVoucher"
              />
              <ms-radio
                label="Bổ sung"
                name="rdname"
                :keyValue="52"
                class="mr-4"
                v-model="model.ref_type"
                :disabled="viewing"
                @msChange="changeVoucher"
              />
            </div>
          </div>
        </div>
        <div class="amount-text">Tổng tiền</div>
        <div class="central-title">
          <div class="flex-row">
            <div class="title-control-group" :class="{active: true}">Thông tin chung</div>
          </div>
          <div class="amount-total">
            <div class="amount-value">
              {{
                $ms.format.formatData(totalAmountComputed, {
                  formatType: $ms.constant.FormatType.Amount,
                })
              }}
            </div>
          </div>
        </div>
        <div above-container v-show="toggleAbove">
          <!-- Bên trên -->
          <div class="above-container">
            <div class="flex-row">
              <!-- Bên trái -->
              <div class="above-left flex6">
                <div class="flex-row control-group">
                  <div class="control-title" :class="{'control-title-small': this.dbOptions?.HeightOption == 1}">
                    <label title="Ngày quyết định">Ngày QĐ</label>
                  </div>
                  <ms-datepicker
                    class="flex2"
                    :disabled="viewing && !isQuickEditVoucher"
                    v-model="model.decision_date"
                  />
                  <div
                    class="control-title-center ml-2"
                    :class="{'control-title-small': this.dbOptions?.HeightOption == 1}"
                  >
                    <label title="Số quyết định">Số QĐ</label>
                  </div>
                  <ms-input
                    class="flex6"
                    v-model="model.decision_no"
                    :maxLength="20"
                    :disabled="viewing && !isQuickEditVoucher"
                  ></ms-input>
                </div>
                <div class="flex-row control-group">
                  <div class="control-title" :class="{'control-title-small': this.dbOptions?.HeightOption == 1}">
                    <label>Chương</label>
                  </div>
                  <ms-combobox
                    class="flex2"
                    :data="comboboxDataRemote.budgetChapter"
                    valueField="budget_chapter_code"
                    displayField="budget_chapter_code"
                    :columns="budgetChapterColumns"
                    v-model="model.budget_chapter_code"
                    :dropdownWidth="600"
                    isReload
                    :initText="model.budget_chapter_code"
                    :rules="[{name: $ms.constant.ValidateRule.Required}]"
                    quickAdd="BudgetChapterDetail"
                    quickSearch="BudgetChapterQuickSearch"
                    :quickSearchParam="quickSearchParam.BudgetChapter"
                    @selected="selectedChapter"
                    @submitQuickAdd="payload => submitQuickAdd(payload, comboboxDataRemote, 'budgetChapter')"
                    :queryMode="'remote'"
                    :remoteFilter="true"
                    @comboboxLoadData="
                      payload =>
                        onBudgetChapterComboboxLoadData(payload, null, {
                          dataField: 'budgetChapter',
                        })
                    "
                    :disabled="viewing"
                  ></ms-combobox>

                  <div
                    class="control-title-center ml-2"
                    :class="{'control-title-small': this.dbOptions?.HeightOption == 1}"
                  >
                    <label>Tên chương</label>
                  </div>
                  <ms-input class="flex6" v-model="model.budget_chapter_name" :disabled="true"></ms-input>
                </div>
                <div class="flex-row control-group">
                  <div class="control-title" :class="{'control-title-small': this.dbOptions?.HeightOption == 1}">
                    <label>Diễn giải</label>
                  </div>
                  <div class="control-right">
                    <ms-input
                      v-model="model.journal_memo"
                      :disabled="viewing && !isQuickEditVoucher"
                      :maxLength="255"
                    ></ms-input>
                  </div>
                </div>
              </div>
              <!-- Bên phải -->
              <div class="above-right">
                <div class="seperator-line"></div>
                <div class="flex-row control-group">
                  <div class="control-title-right" :class="{'control-title-small': this.dbOptions?.HeightOption == 1}">
                    <label title="Ngày chứng từ">Ngày CT</label>
                  </div>
                  <div class="w-205px">
                    <ms-datepicker
                      class="flex2"
                      v-model="model.ref_date"
                      :tooltipIcon="'Chọn ngày tháng'"
                      :disabled="viewing"
                      :rules="[{name: $ms.constant.ValidateRule.Required}]"
                      @onBlurActionDatePicker="onBlurActionDatePicker(this)"
                    />
                  </div>
                </div>
                <div class="flex-row control-group">
                  <div class="control-title-right" :class="{'control-title-small': this.dbOptions?.HeightOption == 1}">
                    <label title="Ngày hạch toán">Ngày HT</label>
                  </div>
                  <div class="w-205px">
                    <ms-datepicker
                      class="flex2"
                      v-model="model.posted_date"
                      :tooltipIcon="'Chọn ngày tháng'"
                      :disabled="viewing"
                      :rules="[{name: $ms.constant.ValidateRule.Required}]"
                    />
                  </div>
                </div>
                <div class="flex-row control-group">
                  <div class="control-title-right" :class="{'control-title-small': this.dbOptions?.HeightOption == 1}">
                    <label title="Số chứng từ">Số CT</label>
                  </div>
                  <div class="w-205px">
                    <ms-input
                      class="flex2"
                      v-model="model.ref_no"
                      :maxLength="20"
                      :rules="[{name: $ms.constant.ValidateRule.Required}]"
                      :disabled="viewing"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div class="flex-row allocation-title pb-2">
              <div class="flex-row step-6 align-center">
                <label class="label allocation">Phân bổ</label>
                <ms-radio
                  label="Không phân bổ"
                  name="rdname2"
                  :keyValue="0"
                  class="mr-4 mb-1 mt-1"
                  v-model="model.allocation_config"
                  @click="selectAllocationConfig(0)"
                  :disabled="viewing"
                />
                <ms-radio
                  label="Theo quý"
                  name="rdname2"
                  :keyValue="1"
                  class="mr-4 mb-1 mt-1"
                  v-model="model.allocation_config"
                  @click="selectAllocationConfig(1)"
                  :disabled="viewing"
                />
                <ms-radio
                  label="Theo tháng"
                  name="rdname2"
                  :keyValue="2"
                  class="mr-4 mb-1 mt-1"
                  v-model="model.allocation_config"
                  @click="selectAllocationConfig(2)"
                  :disabled="viewing"
                />
                <ms-button
                  text="Tự động phân bổ"
                  class="btn-get-data"
                  :disabled="model.allocation_config == 0 || viewing"
                  radius
                  @click="onAllocationEvent"
                >
                </ms-button>
              </div>
            </div>
          </div>
        </div>
        <!-- Bên dưới -->
        <div class="flex1 under-container flex-column">
          <button
            class="toggle-above icon24"
            :class="{expand: toggleAbove}"
            :tabindex="-1"
            @click="toggleAboveHandler"
            v-if="!toggleAbove"
            v-tooltip="'Mở rộng'"
          ></button>
          <button
            class="toggle-above icon24"
            :class="{expand: toggleAbove}"
            :tabindex="-1"
            @click="toggleAboveHandler"
            v-if="toggleAbove"
            v-tooltip="'Thu nhỏ'"
          ></button>
          <ms-resize-screen isFlex class="flex-column flex">
            <template v-slot:content-master>
              <div class="toolbar-grid flex-between">
                <div class="content-left">
                  <div
                    class="item-tabs"
                    :class="{active: selectedTab == 0}"
                    @click="selectedTabHandler(0)"
                    :tabindex="-1"
                  >
                    Hạch toán
                  </div>
                  <div
                    class="item-tabs"
                    :class="{active: selectedTab == 1}"
                    v-if="model.allocation_config == 1"
                    @click="selectedTabHandler(1)"
                    :tabindex="-1"
                  >
                    Phân bố theo quý
                  </div>
                  <div
                    class="item-tabs"
                    :class="{active: selectedTab == 2}"
                    v-if="model.allocation_config == 2"
                    @click="selectedTabHandler(2)"
                    :tabindex="-1"
                  >
                    Phân bố theo tháng
                  </div>
                </div>

                <div class="flex-row flex-center">
                  <ms-checkbox
                    class="col-1 mr-1 flex step-readjust"
                    v-if="isAdjustment"
                    v-model="model.is_readjust"
                    label="Chỉnh lý quyết toán"
                    @change="onChangeAdjustment"
                    :disabled="viewing"
                  />
                  <div
                    v-if="isAdjustment"
                    class="icon16 ic-information-blue-small-bg mr-3"
                    v-tooltip="{
                      content:
                        'Đánh dấu chứng từ là chứng từ chỉnh lý quyết toán để số liệu<br> được tính vào báo cáo quyết toán cho ngân sách năm trước.',
                      placement: 'bottom',
                      html: true,
                    }"
                  ></div>

                  <label class="label text-nowrap">Loại tiền</label>
                  <div class="ml-2">
                    <ms-combobox
                      :columns="currencyColumns"
                      valueField="currency_code"
                      displayField="currency_code"
                      ref="refCurrencyCode"
                      :data="comboboxDataRemote.currency"
                      v-model="model.currency_code"
                      :initText="model.currency_code"
                      @selected="selectCurrency"
                      @blur="assignValueCurrency"
                      :dropdownWidth="600"
                      :class="['input-editor', 'currency-combo']"
                      :queryMode="'remote'"
                      :remoteFilter="true"
                      @comboboxLoadData="onCurrencyComboboxLoadData"
                      :disabled="viewing"
                      class="cb-currency"
                    ></ms-combobox>
                  </div>
                  <label
                    class="text-nowrap ml-2"
                    v-show="model.currency_code != $t('i18nEnum.Currency.VND') && model.currency_code"
                    >Tỷ giá</label
                  >
                  <div class="ml-2" v-show="model.currency_code != $t('i18nEnum.Currency.VND') && model.currency_code">
                    <ms-number
                      class="combo-currency"
                      v-model="model.exchange_rate"
                      :formatType="$ms.constant.FormatType.ExchangeRate"
                      :disabled="viewing"
                      @onActionBlur="onActionBlur"
                    ></ms-number>
                  </div>
                  <menu-wrapper class="topnav-widget-more-container" v-if="model.ref_type === 51">
                    <template #menu-button="{toggleMenu}">
                      <ms-button
                        :disabled="viewing"
                        rightIcon="down-arrow-black"
                        text="Định khoản nhanh"
                        class="ml-2"
                        @click="toggleMenu"
                        :hasBorder="true"
                        type="outline-button circle-button btn-multi-action"
                      />
                    </template>
                    <template #menu-content>
                      <menu-item
                        v-for="(item, index) in accountingActions"
                        :key="index"
                        :seperatorBottom="item.seperatorBottom"
                        @click="clickQuickAccounting(item.id)"
                        >{{ item.text }}
                      </menu-item>
                    </template>
                  </menu-wrapper>
                </div>
              </div>
              <div class="grid-container">
                <ms-grid-editor
                  formId="bu-plan-receipt-detail"
                  :data="model.BUPlanReceiptDetails"
                  :ref="refDetail"
                  class="flex-box"
                  v-model:list="model.BUPlanReceiptDetails"
                  idField="ref_detail_id"
                  greyTitle
                  :propsData="propsData"
                  @updateBusiness="changeDataBusiness"
                  @resizeStop="onResizeStop"
                  :changeTriggers="changeTriggers"
                  :configVoucherQuickEdit="configVoucherQuickEdit"
                  :isQuickEditVoucher="isQuickEditVoucher"
                  :footer="true"
                  :filterable="false"
                  :disabled="viewing"
                  @onEditEventCellEditor="
                    (colIndex, rowIndex, $grid) => {
                      toggleAboveHandlerGrid(colIndex, rowIndex, $grid, this);
                    }
                  "
                  @copyDownRow="copyDownRow"
                  @copyActionClick="copyActionClick"
                  isCopyDataColumn
                  :lineBreak="this.dbOptions?.LineBreak ?? 1"
                  :textarea="true"
                  :itemRightClicks="itemRightClicks"
                  @afterRightClickAction="viewAccount(this)"
                ></ms-grid-editor>
              </div>
            </template>
            <template v-slot:content-item>
              <div class="flex-column flex">
                <div class="toolbar-grid flex-between">
                  <div class="content-left">
                    <div class="item-tabs active">Hạch toán đồng thời</div>
                  </div>

                  <div class="flex-row flex-center">
                    <ms-button
                      type="icon-button"
                      leftIcon="update-down"
                      text="Cập nhật hạch toán đồng thời"
                      @click="generateParallel(true)"
                      :disabled="viewing"
                      class="update-btn"
                    />
                  </div>
                </div>
                <div class="flex d-flex">
                  <ms-grid-editor
                    formId="bu-plan-receipt-detail"
                    :disabled="viewing"
                    :data="model.Parallels"
                    v-model:list="model.Parallels"
                    ref="refDetailParallel"
                    class="flex-box"
                    idField="ref_detail_id"
                    greyTitle
                    :columns="columnsDataParalell"
                    :propsData="propsDataParalell"
                    @submitQuickAdd="() => onSubmitQuickAdd(...argurments, comboboxDataRemote)"
                    :footer="true"
                    @updateBusiness="changeDataBusiness"
                    :changeTriggers="changeTriggerParallels"
                    @onEditEventCellEditor="
                      (colIndex, rowIndex, $grid) => {
                        toggleAboveHandlerGrid(colIndex, rowIndex, $grid, this);
                      }
                    "
                    :name="'gridParallel'"
                    @copyDownRow="copyDownRow"
                    @copyActionClick="copyActionClick"
                    isCopyDataColumn
                    :lineBreak="this.dbOptions?.LineBreak ?? 1"
                    :textarea="true"
                    :configVoucherQuickEdit="configParallelGrid"
                    :isQuickEditVoucher="isQuickEditVoucher"
                    :itemRightClicks="itemRightClicks"
                    @afterRightClickAction="viewAccount(this)"
                  ></ms-grid-editor>
                </div>
              </div>
            </template>
          </ms-resize-screen>
        </div>
      </div>

      <ms-tour
        :steps="stepsDynamic"
        v-model:open="showStep"
        container=".bu-plan-receipt-detail"
        @changeStep="changeStep"
        filterShow
      ></ms-tour>
    </template>

    <!-- footer -->
    <template v-slot:footer="{close}">
      <div class="h-100 flex-between flex1" style="flex-direction: row-reverse">
        <div>
          <div class="flex-row" v-if="!viewing" style="flex-direction: row-reverse">
            <ms-button
              text="Cất"
              v-tooltip="'Cất (Ctrl + S)'"
              class="step-close"
              shortkey-target="Save"
              @click="commandClick($ms.constant.Command.SaveView)"
            ></ms-button>
            <ms-button
              text="Hoãn"
              type="btn-custom"
              class="mr-footer-btn"
              v-tooltip="'Hoãn (Ctrl + U)'"
              shortkey-target="Postpone"
              @click="commandClick($ms.constant.Command.Postpone)"
              v-if="!viewing"
            ></ms-button>
          </div>
          <div class="flex-row" v-if="viewing">
            <ms-button
              text="Sửa"
              class="mr-footer-btn step-8-unposted"
              type="btn-custom"
              v-tooltip="'Sửa (Ctrl + E)'"
              shortkey-target="Edit"
              v-if="this.isShowEditAndPosted && !this.isFromCompareConvert"
              @click="onEditEvent"
            ></ms-button>

            <ms-button
              text="Ghi sổ"
              v-tooltip="'Ghi sổ (Ctrl + G)'"
              v-if="this.isShowEditAndPosted"
              class="step-close"
              shortkey-target="Posted"
              @click="commandClick($ms.constant.Command.Posted)"
            ></ms-button>
            <!-- start -->
            <div class="flex-row" v-if="this.isShowUnPosted && isQuickEditVoucher" style="flex-direction: row-reverse">
              <ms-button
                text="Cất"
                v-tooltip="'Cất (Ctrl + S)'"
                class="step-close"
                shortkey-target="Save"
                @click="commandClick($ms.constant.Command.SaveView)"
              ></ms-button>
              <ms-button
                text="Hoãn"
                type="btn-custom"
                class="mr-footer-btn"
                v-tooltip="'Hoãn (Ctrl + U)'"
                shortkey-target="Postpone"
                @click="commandClick($ms.constant.Command.Postpone)"
              ></ms-button>
            </div>
            <ms-button
              text="Sửa nhanh"
              title="Sửa nhanh"
              class="mr-footer-btn step-7-posted"
              type="btn-custom"
              v-if="this.isShowUnPosted && !isQuickEditVoucher"
              shortkey-target="QuickEdit"
              @click="eventQuickEditVoucher"
            ></ms-button>
            <!-- end -->
            <ms-button
              text="Bỏ ghi"
              title="Bỏ ghi (Ctrl + B)"
              v-if="this.isShowUnPosted && !isQuickEditVoucher"
              class="step-close"
              shortkey-target="UnPosted"
              @click="commandClick($ms.constant.Command.UnPosted)"
            ></ms-button>
          </div>
        </div>

        <div class="flex-row flex-center" v-if="!this.isFromCompareConvert">
          <ms-button
            leftIcon="refresh-white-big"
            type="btn-footer-helpful"
            text="Nạp"
            @click="refresh"
            v-tooltip="'Nạp (Ctrl + R)'"
            shortkey-target="Refresh"
            :disabled="this.editMode != this.$ms.constant.FormState.View"
            class="btn-opacity max-height pl-1"
            v-show="this.isShowRefreshAndApprove"
          ></ms-button>
          <div class="seperator-button" v-show="this.isShowRefreshAndApprove"></div>

          <ms-drop-down-button
            leftIcon="utilities-white-big"
            type="secondary-outline"
            text="Tiện ích"
            class="max-height step-5-pos"
            classCustom="btn-opacity"
            :menuItems="buttonUtilities"
            isBtnFooterHelpFul
            @menuClick="clickItemHandle"
            :byDateClose="!this.isShowRefreshAndApprove"
          ></ms-drop-down-button>

          <div class="seperator-button"></div>

          <ms-drop-down-button
            leftIcon="print-white-big"
            type="secondary-outline"
            text="In"
            :isBtnPrint="true"
            @printPreviousReport="printPreviousReport"
            class="max-height step-6-pos"
            classCustom="btn-opacity"
            :menuItems="printMenu"
            isBtnFooterHelpFul
            :maxHeight="$t('i18nNumber.maxPrintHeight')"
            :disabled="!viewing"
            @menuClick="printItemCLick"
            shortkey-target="Print"
          ></ms-drop-down-button>

          <div class="seperator-button" v-show="this.isShowRefreshAndApprove"></div>

          <ms-button
            leftIcon="approve-white-big"
            type="btn-footer-helpful"
            text="Duyệt"
            shortkey-target="Approve"
            class="btn-opacity max-height"
            :disabled="!viewing || isShowFromReport || stateApprove"
            @click="onApproveAction"
            v-show="this.isShowRefreshAndApprove"
          ></ms-button>
          <div class="seperator-button"></div>

          <ms-button
            leftIcon="ic-delete-voucher"
            type="btn-footer-helpful"
            text="Xóa"
            shortkey-target="Delete"
            class="btn-opacity max-height step-7-unposted"
            v-tooltip="'Xóa (Ctrl + D)'"
            :disabled="disabledDelete"
            @click="clickItemHandle({command: $ms.constant.Command.Delete})"
          ></ms-button>
          <button
            shortkey-target="Add"
            @click="clickItemHandle({command: $ms.constant.Command.Add})"
            class="d-none"
            v-if="viewing"
          ></button>
          <button
            shortkey-target="Duplicate"
            @click="clickItemHandle({command: $ms.constant.Command.Duplicate})"
            class="d-none"
            v-if="viewing"
          ></button>
          <button
            shortkey-target="CopyVoucher"
            @click="clickItemHandle({command: $ms.constant.Command.Copy})"
            class="d-none"
            v-if="!viewing"
          ></button>
          <button
            shortkey-target="ViewAccount"
            @click="clickItemHandle({command: $ms.constant.Command.ViewAccount})"
            class="d-none"
          ></button>
          <button
            shortkey-target="Delete"
            @click="clickItemHandle({command: $ms.constant.Command.Delete})"
            class="d-none"
            v-if="viewing && !model.is_posted && this.isShowRefreshAndApprove"
          ></button>
        </div>

        <div class="flex-row">
          <ms-button
            type="btn-custom"
            v-if="viewing && this.isShowRefreshAndApprove && !this.isFromCompareConvert"
            leftIcon="left-arrow-white"
            :disabled="!currentIndexBack"
            v-tooltip="'Trước'"
            class="mr-1"
            shortkey-target="ArrowLeft"
            @click="commandClick(this.$ms.constant.Command.BackVoucher)"
          ></ms-button>
          <ms-button
            type="btn-custom"
            v-if="viewing && this.isShowRefreshAndApprove && !this.isFromCompareConvert"
            :disabled="!currentIndexNext"
            v-tooltip="'Sau'"
            shortkey-target="ArrowRight"
            leftIcon="right-arrow-white"
            @click="commandClick(this.$ms.constant.Command.NextVoucher)"
            class="mr-1"
          ></ms-button>
          <ms-button
            text="Đóng"
            type="btn-custom"
            class="mr-2"
            v-tooltip="'Đóng (Ctrl + Q)'"
            @click="close"
            shortkey-target="Quit"
          ></ms-button>
        </div>
      </div>
    </template>
  </ms-dynamic-popup>
</template>
<script>
import msDynamicPopup from '@/components/popup/MsDynamicPopup.vue';
import msGridEditor from '@/components/gridEditor/MsGridEditor.vue';
import baseDetailVoucher from '@/views/base/baseDetailVoucher';
import {ModuleBuPlanReceipt, ModuleTask, ModuleProject, ModuleBudgetChapter} from '@/stores/moduleConst';
import baseDetailPopup from '@/views/base/baseDetailPopup';
import {useBudgetPlanReceiptDetailData} from './BUPlanReceiptDetailData.js';
import MenuWrapper from '@/components/dropdown/MenuWrapper.vue';
import MenuItem from '@/components/dropdown/MenuItem.vue';
import budgetChapterAPI from '@/apis/di/budgetChapterAPI.js';
import {useComboboxColumns} from '@/commons/combobox/comboboxColumns';
import {useRemoteCombobox} from '@/setup/remoteCombobox.js';
import {showConfirm, showConfirmValidate} from '@/commons/globalMessage';
import currencyAPI from '@/apis/di/currencyAPI.js';
import budgetKindItemAPI from '@/apis/di/budgetKindItemAPI.js';
import {reactive, ref, getCurrentInstance, onMounted, computed, watch, shallowRef} from 'vue';
import popupUtil from '@/commons/popupUtil';
import commonFn from '@/commons/commonFunction.js';
import {useQuickAccountingVoucher} from '@/setup/utilities/quickAccountingVoucher.js';
import RefType from '@/commons/wildcards/constants/RefType.js';
import {useCurrencyCombo} from '@/commons/combobox/CurrencyCombo.js';
import {useCurrencyShowColumn} from '@/commons/gridColumn/CurrencyShowColumn.js';
import {useInforCommons} from '../../utility/commons/inforCommons.js';
import {useActionGridEditor} from '@/commons/gridColumn/ActionGridEditor.js';
import MsTour from '@/components/tour/MsTour.vue';
import {useActionParallel} from '@/commons/gridColumn/ActionParallel.js';
import msResizeScreen from '@/components/resize-wrapper/MsResizeScreen.vue';
import {useValidateBudgetSourceAccount} from '@/views/utility/commons/validateBudgetSourceAccount.js';
import {ModuleBudgetItem} from '@/stores/moduleConst';
import _ from 'lodash';
import {useCacheBudgetItemComboConfig} from '@/commons/combobox/cacheCombo/cacheBudgetItemComboConfig.js';

export default {
  components: {
    msDynamicPopup,
    msGridEditor,
    MenuWrapper,
    MenuItem,
    MsTour,
    msResizeScreen,
  },
  extends: baseDetailVoucher,
  name: 'BUPlanReceiptDetail',
  setup(props) {
    const titleCode = 'detail_popup_buplanreceiptdetail';
    const {proxy} = getCurrentInstance();
    const module = ModuleBuPlanReceipt;
    let layoutTagDetail = ref('BUPlanReceiptDetail');
    const currentLayout = ref('BUPlanReceiptDetail');
    /**
     * Cấu hình ref grid để base đọc
     */
    proxy._gridDetails = {
      BUPlanReceiptDetails: 'refDetail',
      Parallels: 'refDetailParallel',
    };
    const {refType, clickQuickAccounting, accountingActions, addAutoBusiness, saveAsNewAutoBusiness} =
      useQuickAccountingVoucher({
        gridDetails: proxy._gridDetails,
      });

    refType.value = RefType.BUPlanReceipt;

    // Khai báo biến cache cho tiết tiểu mục để tối ưu hiệu suất
    const {cacheBudgetDetailItemComboConfig} = useCacheBudgetItemComboConfig();

    const {selectedProject, selectedBank, selectedAccountingObject, onBlurActionDatePicker, viewAccount} =
      useInforCommons();

    // Cập nhật lại tổng tiền khi xóa dòng dữ liệu chi tiết
    const {
      afterDeleteRow,
      changeDataBusinessCommon,
      defaultData,
      getDataDefault,
      toggleAboveHandlerGrid,
      bindDefaultData,
      onGridStyleColumn,
      copyDownRow,
      copyActionClick,
    } = useActionGridEditor(proxy);

    // Validate tài khoản và nguồn
    const {onPosted, customUnPostedSuccess} = useValidateBudgetSourceAccount();

    /**
     * Lấy tài khoản tương ứng theo tính chất nguồn và check chọn Chỉnh lý quyết toán
     * dtnga3 (22.05.2024)
     */
    function getAccountBySourceGroupPropertyTypeAndAdjustment(row, isReadjust) {
      var debitAccount = '';
      switch (row.budget_source_group_property_type) {
        case proxy.$ms.constant.BudgetSourceGroupPropertyType.Regular:
          if (isReadjust) {
            debitAccount = proxy.$ms.constant.AccountNumber.IrregularSpendingBudgetLastYear;
          } else {
            debitAccount = proxy.$ms.constant.AccountNumber.IrregularSpendingBudgetThisYear;
          }
          break;
        case proxy.$ms.constant.BudgetSourceGroupPropertyType.IRegular:
          if (isReadjust) {
            debitAccount = proxy.$ms.constant.AccountNumber.EstimatedRecurrentExpensesLastYear;
          } else {
            debitAccount = proxy.$ms.constant.AccountNumber.EstimatedRecurrentExpensesThisYear;
          }
          break;
        case proxy.$ms.constant.BudgetSourceGroupPropertyType.Invest:
          if (isReadjust) {
            debitAccount = proxy.$ms.constant.AccountNumber.InvestmentestimateLastYear;
          } else {
            debitAccount = proxy.$ms.constant.AccountNumber.InvestmentestimateThisYear;
          }
          break;
        default:
          // nếu tính chất nguồn k chọn/ bỏ trống tính chất nguồn thì giữ nguyên tk nợ ban đầu
          debitAccount = row.debit_account;
          break;
      }
      return debitAccount;
    }

    /**
     * Lấy tài khoản tương ứng theo tính chất nguồn và phân loại dự toán chi NSNN Bumas
     * dtnga3 (10/05/2025)
     */
    function getAccountBySourceGroupPropertyTypeBumas(row, type) {
      var debitAccount = '';
      // thuộc Bảng dữ liệu nguồn Viện trợ, vay nợ
      if(row.source_type == 2){
        debitAccount = proxy.$ms.constant.AccountNumber.ForeignDebtThisYear2;
      }
      // Nguồn Ngân sách trong nước
      else{
        switch(type){
          // Chi thường xuyên
          case 1:
            switch (row.budget_source_group_property_type) {
              case proxy.$ms.constant.BudgetSourceGroupPropertyType.Regular:
                  debitAccount = proxy.$ms.constant.AccountNumber.IrregularSpendingBudgetThisYear;
                break;
              case proxy.$ms.constant.BudgetSourceGroupPropertyType.IRegular:
                debitAccount = proxy.$ms.constant.AccountNumber.EstimatedRecurrentExpensesThisYear;
                break;
            }
            break;
          // Chi đầu tư
          case 2:
            debitAccount = proxy.$ms.constant.AccountNumber.InvestmentestimateThisYear;
            break;
        }
      }
      return debitAccount;
    }

    /**
     * Xử lý thêm khi bind thông tin mặc định khi click dòng trống/thêm dòng
     */
    function customDefaultData($grid, me, rowIndex) {
      if (!$grid.propsData.isParallel) {
        $grid.dataView[rowIndex].debit_account = getAccountBySourceGroupPropertyTypeAndAdjustment(
          $grid.dataView[rowIndex],
          proxy.model.is_readjust,
        );
      }
      // nghiệp vụ
      if (proxy.model.ref_type === proxy.$ms.constant.RefType.BUPlanSupplement) {
        $grid.dataView[rowIndex].cash_withdraw_type_id = proxy.$ms.constant.CashWithDrawType.Supplement;
        $grid.dataView[rowIndex].cash_withdraw_type_name = 'Bổ sung';
      } else {
        $grid.dataView[rowIndex].cash_withdraw_type_id = proxy.$ms.constant.CashWithDrawType.PlanReceipt; // nghiệp vụ
        $grid.dataView[rowIndex].cash_withdraw_type_name = 'Nhận dự toán';
      }
      // cấp phát
      $grid.dataView[rowIndex].method_distribute_type = proxy.$ms.constant.MethodDistributeType.Budget;
      $grid.dataView[rowIndex].method_distribute_name = 'Dự toán';
      $grid.dataView[rowIndex].budget_chapter_code = proxy.model.budget_chapter_code;
    }

    //Param dùng cho form tìm nhanh
    const quickSearchParam = reactive({
      BudgetChapter: {
        isFilter: true,
        filterFunc: x => x.active,
      },
    });

    proxy._defaultRow = 3;

    const clearFields = [
      'state',
      'ref_id',
      'ref_detail_id',
      'selected',
      'amount',
      'amount_oc',
      'indexRow',
      'amount_month1_oc',
      'amount_month2_oc',
      'amount_month3_oc',
      'amount_month4_oc',
      'amount_month5_oc',
      'amount_month6_oc',
      'amount_month7_oc',
      'amount_month8_oc',
      'amount_month9_oc',
      'amount_month10_oc',
      'amount_month11_oc',
      'amount_month12_oc',
      'amount_month1',
      'amount_month2',
      'amount_month3',
      'amount_month4',
      'amount_month5',
      'amount_month6',
      'amount_month7',
      'amount_month8',
      'amount_month9',
      'amount_month10',
      'amount_month11',
      'amount_month12',
      'amount_quater1_oc',
      'amount_quater2_oc',
      'amount_quater3_oc',
      'amount_quater4_oc',
      'amount_quater1',
      'amount_quater2',
      'amount_quater3',
      'amount_quater4',
      'amount',
      'amount_oc',
    ];

    // Config dành cho sửa nhanh chứng từ
    const configVoucherQuickEdit = [
      'description',
      'task_code',
      'fund_structure_name', //cơ cấu vốn
      'is_source_before_year', // nguồn năm trước
      'topic_code', //đề tài
      'project_activity_id', //hoạt động dự án
      'project_expense_id', //khoản chi dự án
      'project_expense_code',
    ];
    // Config dành cho sửa nhanh Hạch toán đồng thời
    const configParallelGrid = ['description'];

    const subSystemCode = proxy.$ms.constant.SubSystemCode.BUPlanReceipt;

    const {budgetChapterColumns, currencyColumns} = useComboboxColumns();
    const {comboboxLoadData, submitQuickAdd} = useRemoteCombobox();
    const {
      toggleAbove,
      toggleAboveHandler,
      buttonUtilities,
      buttonPrints,
      selectedTab,
      comboboxDataRemote,

      selectedChapter,
      selectedCurrency,
      onBudgetChapterComboboxLoadData,
      onActionBlur,
      selectCurrency,
      currencyCode,
      isFirst,
      amountOcColumnMapper,
      budgetDetailItemComboConfig,
      cacheAccountDebitCombo,
      cacheBudgetSourceComboConfig,
      cacheBankInfoComboConfig,
      cacheBudgetItemComboConfig,
      cacheProjectComboConfig,
      cacheStatisticComboConfig,
      cacheBudgetGroupItemComboConfig,
      cacheTaskComboConfig,
      cacheBudgetKindItemComboConfig,
      cacheBudgetSubKindItemComboConfig,
      cacheFundStructureComboConfig,
      cacheTopicComboConfig,
      cacheBudgetProvideComboConfig,
      projectExpenseComboConfig,
      cacheAccountDebitParalellCombo,
      cacheAccountCreditParalellCombo,
      cacheBudgetSubItemComboConfig,
      cacheBudgetChapterComboConfig,
      cacheContractComboConfig,
      cacheBudgetFeesComboConfig,
      cacheActivityComboConfig,
      cacheFundComboConfig,
      columnParallel,
    } = useBudgetPlanReceiptDetailData(proxy);

    // Ẩn checkbox Chỉnh lý quyết toán nếu ngày HT khác tháng 1
    const isAdjustment = computed(() => {
      if (
        proxy.model.posted_date &&
        new Date(proxy.model.posted_date).getMonth() + 1 != proxy.$ms.constant.FixValue.ReadJustMonth
      ) {
        // hạch toán tháng > 1 thì tương đương với TH uncheck chỉnh lý quyết toán
        if (proxy.model.is_readjust) {
          proxy.model.is_readjust = false;
          onChangeAdjustment(false);
        }
        return false;
      } else {
        return true;
      }
    });

    /**
     * Config tùy chỉnh giao diện
     * NNkiem 08.07.2022
     */
    function getConfigLayout() {
      let ignoreFields = amountOcColumnMapper.map(x => x.amount);
      // ẩn hiện cột mục hay nhóm mục
      let isDetalChapter = this.$store.state.dbOption.dbOptions.BudgetPlanReceiptMode;
      if (isDetalChapter) {
        ignoreFields.push('budget_group_item_code');
      } else {
        ignoreFields.push('budget_group_item');
      }
      return {
        layouts: [
          {tag: 'BUPlanReceiptDetail', name: 'Hạch toán', ignoreFields},
          {
            tag: 'BUPlanReceiptDetailQuater',
            name: 'Phân bổ theo quý',
            ignoreFields,
          },
          {
            tag: 'BUPlanReceiptDetailMonth',
            name: 'Phân bổ theo tháng',
            ignoreFields,
          },
        ],
      };
    }

    /**
     * Lấy dữ liệu cất: Bổ sung thêm ref_type
     * NOTE:  override để truyền lại reftype
     * NNKIEM 22.07.2022
     * NQHUY1 01.03.2024: Sử dụng hàm hasOwnProperty không ảnh hưởng bởi PBI 419812
     * */
    function customSubmitParam({Model}) {
      const me = this;
      if (Model && proxy.model.ref_type) {
        Model.ref_type = proxy.model.ref_type;
        const {_gridDetails} = me;
        if (_gridDetails) {
          for (const key in _gridDetails) {
            if (Object.hasOwnProperty.call(_gridDetails, key)) {
              if (Array.isArray(Model[key])) {
                Model[key].forEach(x => {
                  if (x.state === me.$ms.constant.ModelState.Insert || x.state === me.$ms.constant.ModelState.Update) {
                    x.ref_type = proxy.model.ref_type;
                  }
                });
              }
            }
          }
        }
      }
    }

    /**
     * Cấu hình các field của grid
     */
    const propsData = reactive({
      description: {
        maxLength: 255,
      },
      budget_source_name: cacheBudgetSourceComboConfig,
      debit_account: cacheAccountDebitCombo,
      budget_item_code: cacheBudgetItemComboConfig,
      budget_kind_item_code: cacheBudgetKindItemComboConfig,
      budget_sub_kind_item_code: cacheBudgetSubKindItemComboConfig,
      bank_account: cacheBankInfoComboConfig,
      project_code: cacheProjectComboConfig,
      statistic_code: cacheStatisticComboConfig,
      budget_group_item_code: cacheBudgetGroupItemComboConfig,
      task_code: cacheTaskComboConfig,

      budget_detail_item_code: cacheBudgetDetailItemComboConfig,
      fund_structure_name: cacheFundStructureComboConfig,
      topic_code: cacheTopicComboConfig,
      budget_provide_code: cacheBudgetProvideComboConfig,
      project_expense_code: projectExpenseComboConfig,
      is_source_before_year: {},
      budget_sub_item_code: cacheBudgetSubItemComboConfig,
      budget_chapter_code: cacheBudgetChapterComboConfig,
      contract_no: cacheContractComboConfig,
      budget_fees_code: cacheBudgetFeesComboConfig,
      method_distribute_name: {
        enum: 'MethodDistributeType',
        modelValueField: 'method_distribute_type',
        dropdownWidth: 200,
      },
      cash_withdraw_type_name: {
        enum: 'CashWithDrawType',
        modelValueField: 'cash_withdraw_type_id',
        dropdownWidth: 300,
      },
      activity_name: cacheActivityComboConfig,
      fund_code: cacheFundComboConfig, // loại quỹ
      rowAction: ['Insert', 'Delete'],

      journal_memo: {
        isAlwayEdit: true,
      },
    });
    // Cấu hình các feild của grid hạch toán
    const propsDataParalell = Object.assign({}, propsData, {amount_oc: {}});
    propsDataParalell.debit_account = cacheAccountDebitParalellCombo;
    propsDataParalell.credit_account = cacheAccountCreditParalellCombo;
    propsDataParalell.isParallel = true;

    const changeTriggerParallels = shallowRef([
      'budget_kind_item_code',
      'budget_sub_kind_item_code',
      'budget_item_code',
      'budget_sub_item_code',
      // 'budget_source_name',
      'amount_oc',
      'budget_detail_item_code',
      'credit_account',
      'debit_account',
    ]);
    /**
     *Xử lý nghiệp vụ khi thay đổi dữ liệu trên grid detail
     *NNLINH 13.06.2022
     */
    const changeDataBusiness = ($grid, col, row, metaData, callbackUpdateRow) => {
      let rowData = $grid.dataView[row]; //lấy ra dữ liệu của hàng đang sửa
      const {tracking} = metaData;
      const {dataField} = col;
      let oldVal = tracking?.oldVal ?? 0;
      let newVal = tracking?.newVal ?? 0;
      let budgetItems = [];

      switch (dataField) {
        case 'budget_source_name':
          changeDataBusinessCommon($grid, col, row, metaData, callbackUpdateRow, dataField, tracking);
          var debitAccount = getAccountBySourceGroupPropertyTypeAndAdjustment(rowData, proxy.model.is_readjust);
          if (debitAccount && debitAccount != rowData.debit_account) {
            callbackUpdateRow({debit_account: debitAccount}, row);
          }
          break;
        case 'budget_group_item_code':
          rowData.budget_item_code = metaData?.rep_budget_item_code;
          rowData.budget_sub_item_code = null;
          break;
        case 'budget_item_code':
          rowData.budget_group_item_code = metaData?.budget_group_item_code;
          rowData.budget_sub_item_code = null;
          break;
        case 'budget_sub_item_code':
          // Cập nhật Mục
          budgetItems = proxy.$store.getters[`${ModuleBudgetItem}/items`];
          let budgetSubItem = budgetItems.find(x => x.budget_item_code == tracking.newVal);
          let result = budgetItems.find(x => x.budget_item_id == budgetSubItem?.parent_id);
          if (result) {
            callbackUpdateRow({budget_item_code: result.budget_item_code}, row);
          }
          // Cập nhật nhóm mục chi nếu có
          if(budgetSubItem && budgetSubItem.budget_group_item_code){
            callbackUpdateRow({budget_group_item_code: budgetSubItem.budget_group_item_code}, row);
          }
          break;
        case 'budget_kind_item_code':
          rowData.misa_code_id = metaData?.misa_code_id;
          callbackUpdateRow({budget_sub_kind_item_code: null}, row);
          rowData.budget_sub_kind_item_id = null;
          break;
        case 'amount_oc':
          // gán lại tiền tháng 12 và quý 4
          rowData.amount_quater4_oc = (rowData?.amount_quater4_oc || 0) + (newVal || 0) - (oldVal || 0);
          rowData.amount_month12_oc = (rowData?.amount_month12_oc || 0) + (newVal || 0) - (oldVal || 0);
          onActionBlur(proxy.model.exchange_rate);
          break;
        case 'amount_month12_oc':
          // đổi t12 thì tính lại tiền tháng 11 cho đúng tổng
          rowData.amount_month11_oc = (rowData?.amount_month11_oc || 0) + (oldVal || 0) - (newVal || 0);
          onActionBlur(proxy.model.exchange_rate);
          break;
        case 'amount_quater4_oc':
          // đổi Q4 thì tính lại tiền Q3 cho đúng tổng
          rowData.amount_quater3_oc = (rowData?.amount_quater3_oc || 0) + (oldVal || 0) - (newVal || 0);
          onActionBlur(proxy.model.exchange_rate);
          break;
        case 'amount_month1_oc':
        case 'amount_month2_oc':
        case 'amount_month3_oc':
        case 'amount_month4_oc':
        case 'amount_month5_oc':
        case 'amount_month6_oc':
        case 'amount_month7_oc':
        case 'amount_month8_oc':
        case 'amount_month9_oc':
        case 'amount_month10_oc':
        case 'amount_month11_oc':
          rowData.amount_month12_oc = (rowData?.amount_month12_oc || 0) + (oldVal || 0) - (newVal || 0);
          onActionBlur(proxy.model.exchange_rate);
          break;
        case 'amount_quater1_oc':
        case 'amount_quater2_oc':
        case 'amount_quater3_oc':
          rowData.amount_quater4_oc = (rowData?.amount_quater4_oc || 0) + (oldVal || 0) - (newVal || 0);
          onActionBlur(proxy.model.exchange_rate);
          break;
        default:
          changeDataBusinessCommon($grid, col, row, metaData, callbackUpdateRow, dataField, tracking);
          break;
      }
    };

    /**
     * custom thêm 1 số trường
     * NXCHIEN 02.11.2022
     *
     */
    function copyDownRowExtend(objAssign, metaData, column, $grid, lastIndex, rowIndex, isShowCombo) {
      let fieldAmount = amountOcColumnMapper.filter(x => x.amount_oc == column.dataField)?.[0]?.amount;
      let budgetItems = [];
      switch (column.dataField) {
        case 'budget_source_name':
          Object.assign(objAssign, {
            budget_source_id: metaData.budget_source_id,
          });
          for (let i = rowIndex + 1; i < lastIndex + 1; i++) {
            let item = $grid.dataView[i];

            let group_property_type = isShowCombo
              ? metaData.group_property_type
              : metaData.budget_source_group_property_type;
            item.budget_source_group_property_type = group_property_type;
            item.debit_account = getAccountBySourceGroupPropertyTypeAndAdjustment(item, proxy.model.is_readjust);
          }
          break;
        case 'budget_group_item_code':
          // modifiedBy dtnga3 (22.05.2024) metaData là dl dòng hạch toán khi focus ra ngoài combo, metadata là dl Nhóm mục chi đang chọn khi vẫn còn focus trên combo, copy nhóm mục chi thì copy luôn mục mặc định của nhóm đó
          for (let i = rowIndex + 1; i < lastIndex + 1; i++) {
            let item = $grid.dataView[i];
            item.budget_item_code = metaData?.budget_item_code || metaData?.rep_budget_item_code;
            item.budget_sub_item_code = null;
          }
          break;
        case 'budget_item_code':
          // chỉ gán lại Khoản về null khi Loại khác so với metaData.budget_kind_item_code
          for (let i = rowIndex + 1; i < lastIndex + 1; i++) {
            let item = $grid.dataView[i];
            item.budget_group_item_code = metaData?.budget_group_item_code;
            item.budget_sub_item_code = null;
          }
          break;
        case 'budget_kind_item_code':
          // chỉ gán lại Khoản về null khi Loại khác so với metaData.budget_kind_item_code
          for (let i = rowIndex + 1; i < lastIndex + 1; i++) {
            let item = $grid.dataView[i];
            if (metaData.budget_kind_item_code != item.budget_kind_item_code) {
              item.budget_sub_kind_item_code = null;
            }
          }

          break;
        case 'budget_sub_kind_item_code':
          budgetKindItemAPI.getBudgetKindBySubKindCode(objAssign.budget_sub_kind_item_code).then(result => {
            if (result) {
              for (let i = rowIndex + 1; i < lastIndex + 1; i++) {
                let item = $grid.dataView[i];
                item.budget_kind_item_code = result.budget_kind_item_code;
              }
            }
          });
          break;

        case 'budget_sub_item_code':
          budgetItems = proxy.$store.getters[`${ModuleBudgetItem}/items`];
          let budgetSubItem = budgetItems.find(x => x.budget_item_code == objAssign.budget_sub_item_code);
          if(budgetSubItem){
            // kiểm tra dboption nếu có lấy dữ liệu theo mục tiểu mục
            // Kiểm tra các chứng từ liên quan đến VTHH sẽ không bind diễn giải của danh mục
            let refTypeVTHH = [
              RefType.CAPaymentPurchase,
              RefType.BAWithdrawPurchase,
              RefType.PUInvoice,
              RefType.BUTransferPurchase,
              RefType.INInward,
              RefType.INTransfer,
              RefType.INAdjustment,
              RefType.INInwardFromINAdjustment,
              RefType.INInwardFromINAdjustmentChangeAmount,
              RefType.INOutwardFromINAdjustment,
              RefType.INOutwardFromINAdjustmentChangeAmount,
              RefType.INOutward,
              RefType.BADepositSale,
              RefType.SAInvoice,
              RefType.SAReturn,
              RefType.CAReceiptSale,
            ];
            let budgetItem = budgetItems.find(x => x.budget_item_id == budgetSubItem?.parent_id);
            for (let i = rowIndex + 1; i < lastIndex + 1; i++) {
              let item = $grid.dataView[i];

              if (
                proxy &&
                proxy.model &&
                refTypeVTHH.includes(proxy.model.ref_type) &&
                proxy.dbOptions?.UseBugetSubItemNameForDescription
              ) {
                item.description = budgetSubItem.budget_item_name;
              }

              if(budgetSubItem.budget_group_item_code){
                item.budget_group_item_code = budgetSubItem.budget_group_item_code;
              }
              
              item.budget_item_code = budgetItem.budget_item_code;
            }
          }
          break;
        case 'activity_name':
          Object.assign(objAssign, {
            activity_id: metaData.activity_id,
          });
          break;
        case 'method_distribute_name':
          Object.assign(objAssign, {
            method_distribute_type: isShowCombo ? metaData.enumValue : metaData.method_distribute_type,
          });
          break;
        case 'cash_withdraw_type_name':
          Object.assign(objAssign, {
            cash_withdraw_type_id: isShowCombo ? metaData.enumValue : metaData.cash_withdraw_type_id,
          });
          break;
        case 'statistic_code':
          Object.assign(objAssign, {
            statistic_id: metaData.statistic_id,
          });
          break;
        case 'accounting_object_code':
          Object.assign(objAssign, {
            accounting_object_id: metaData.accounting_object_id,
          });
          break;
        case 'topic_code':
          Object.assign(objAssign, {
            topic_id: metaData.topic_id,
          });
          break;
        case 'fund_code':
          Object.assign(objAssign, {
            fund_id: metaData.fund_id,
          });
          break;
        case 'project_code':
          Object.assign(objAssign, {
            project_id: metaData.project_id,
          });
          break;
        case 'fund_structure_name':
          Object.assign(objAssign, {
            fund_structure_id: metaData.fund_structure_id,
          });
          break;
        case 'contract_no':
          Object.assign(objAssign, {
            contract_id: metaData.contract_id,
          });
          break;
        case 'task_code':
          Object.assign(objAssign, {
            task_id: metaData.task_id,
          });
          break;
        case 'amount_oc':
          for (let i = rowIndex + 1; i < lastIndex + 1; i++) {
            let item = $grid.dataView[i];
            // gán lại tiền tháng 12 và quý 4
            item.amount_quater4_oc =
              (item?.amount_quater4_oc || 0) + (objAssign.amount_oc || 0) - (item.amount_oc || 0);
            item.amount_month12_oc =
              (item?.amount_month12_oc || 0) + (objAssign.amount_oc || 0) - (item.amount_oc || 0);
            item.amount_quater4 =
              proxy?.$ms?.commonFn?.roundDecimalDbOption(
                proxy?.$ms?.constant?.DbOptionKey?.CurrencyDecimalDigits,
                item.amount_quater4_oc * proxy.model.exchange_rate,
              ) || item.amount_quater4_oc * proxy.model.exchange_rate;
            item[fieldAmount] =
              proxy?.$ms?.commonFn?.roundDecimalDbOption(
                proxy?.$ms?.constant?.DbOptionKey?.CurrencyDecimalDigits,
                objAssign[column.dataField] * proxy.model.exchange_rate,
              ) || objAssign[column.dataField] * proxy.model.exchange_rate;
          }
          break;
        case 'amount_month12_oc':
          for (let i = rowIndex + 1; i < lastIndex + 1; i++) {
            let item = $grid.dataView[i];
            // gán lại tiền tháng 12 và quý 4
            item.amount_month11_oc =
              (item?.amount_month11_oc || 0) - (objAssign.amount_month12_oc || 0) + (item.amount_month12_oc || 0);
            item.amount_month11 =
              proxy?.$ms?.commonFn?.roundDecimalDbOption(
                proxy?.$ms?.constant?.DbOptionKey?.CurrencyDecimalDigits,
                item.amount_month11_oc * proxy.model.exchange_rate,
              ) || item.amount_month11_oc * proxy.model.exchange_rate;

            item[fieldAmount] =
              proxy?.$ms?.commonFn?.roundDecimalDbOption(
                proxy?.$ms?.constant?.DbOptionKey?.CurrencyDecimalDigits,
                objAssign[column.dataField] * proxy.model.exchange_rate,
              ) || objAssign[column.dataField] * proxy.model.exchange_rate;
          }
          break;
        case 'amount_quater4_oc':
          for (let i = rowIndex + 1; i < lastIndex + 1; i++) {
            let item = $grid.dataView[i];
            // gán lại tiền tháng 12 và quý 4
            item.amount_quater3_oc =
              (item?.amount_quater3_oc || 0) - (objAssign.amount_quater4_oc || 0) + (item.amount_quater4_oc || 0);

            item.amount_quater3 =
              proxy?.$ms?.commonFn?.roundDecimalDbOption(
                proxy?.$ms?.constant?.DbOptionKey?.CurrencyDecimalDigits,
                item.amount_quater3_oc * proxy.model.exchange_rate,
              ) || item.amount_quater3_oc * proxy.model.exchange_rate;

            item[fieldAmount] =
              proxy?.$ms?.commonFn?.roundDecimalDbOption(
                proxy?.$ms?.constant?.DbOptionKey?.CurrencyDecimalDigits,
                objAssign[column.dataField] * proxy.model.exchange_rate,
              ) || objAssign[column.dataField] * proxy.model.exchange_rate;
          }
        case 'amount_month1_oc':
        case 'amount_month2_oc':
        case 'amount_month3_oc':
        case 'amount_month4_oc':
        case 'amount_month5_oc':
        case 'amount_month6_oc':
        case 'amount_month7_oc':
        case 'amount_month8_oc':
        case 'amount_month9_oc':
        case 'amount_month10_oc':
        case 'amount_month11_oc':
          for (let i = rowIndex + 1; i < lastIndex + 1; i++) {
            let item = $grid.dataView[i];
            // gán lại tiền tháng 12 và quý 4
            item.amount_month12_oc =
              (item?.amount_month12_oc || 0) - (objAssign[column.dataField] || 0) + (item[column.dataField] || 0);

            item.amount_month12 =
              proxy?.$ms?.commonFn?.roundDecimalDbOption(
                proxy?.$ms?.constant?.DbOptionKey?.CurrencyDecimalDigits,
                item.amount_month12_oc * proxy.model.exchange_rate,
              ) || item.amount_month12_oc * proxy.model.exchange_rate;

            item[fieldAmount] =
              proxy?.$ms?.commonFn?.roundDecimalDbOption(
                proxy?.$ms?.constant?.DbOptionKey?.CurrencyDecimalDigits,
                objAssign[column.dataField] * proxy.model.exchange_rate,
              ) || objAssign[column.dataField] * proxy.model.exchange_rate;
          }
          break;
        case 'amount_quater1_oc':
        case 'amount_quater2_oc':
        case 'amount_quater3_oc':
          for (let i = rowIndex + 1; i < lastIndex + 1; i++) {
            let item = $grid.dataView[i];
            // gán lại tiền tháng 12 và quý 4
            item.amount_quater4_oc =
              (item?.amount_quater4_oc || 0) - (objAssign[column.dataField] || 0) + (item[column.dataField] || 0);

            item.amount_quater4 =
              proxy?.$ms?.commonFn?.roundDecimalDbOption(
                proxy?.$ms?.constant?.DbOptionKey?.CurrencyDecimalDigits,
                item.amount_quater4_oc * proxy.model.exchange_rate,
              ) || item.amount_quater4_oc * proxy.model.exchange_rate;

            item[fieldAmount] =
              proxy?.$ms?.commonFn?.roundDecimalDbOption(
                proxy?.$ms?.constant?.DbOptionKey?.CurrencyDecimalDigits,
                objAssign[column.dataField] * proxy.model.exchange_rate,
              ) || objAssign[column.dataField] * proxy.model.exchange_rate;
          }
          break;
        default:
          break;
      }
    }

    /**
     * Tự động phân bổ tổng tiền chia đều tiền cho các quý hoặc các tháng
     * NNLINH 06/05/2022
     */
    function onAllocationEvent() {
      showConfirm('Bạn có chắc chắn muốn thực hiện phân bổ tự động không?', 'Tự động phân bổ').then(answer => {
        switch (answer) {
          case true:
            proxy.$refs.refDetail.datax.forEach(items => {
              let allocationAmount = Math.round(items.amount_oc / 4);
              items.amount_quater1_oc = allocationAmount;
              items.amount_quater2_oc = allocationAmount;
              items.amount_quater3_oc = allocationAmount;
              items.amount_quater4_oc = items.amount_oc - allocationAmount * 3;
            });

            proxy.$refs.refDetail.datax.forEach(items => {
              let allocationAmount = Math.round(items.amount_oc / 12);
              items.amount_month1_oc = allocationAmount;
              items.amount_month2_oc = allocationAmount;
              items.amount_month3_oc = allocationAmount;
              items.amount_month4_oc = allocationAmount;
              items.amount_month5_oc = allocationAmount;
              items.amount_month6_oc = allocationAmount;
              items.amount_month7_oc = allocationAmount;
              items.amount_month8_oc = allocationAmount;
              items.amount_month9_oc = allocationAmount;
              items.amount_month10_oc = allocationAmount;
              items.amount_month11_oc = allocationAmount;
              items.amount_month12_oc = items.amount_oc - allocationAmount * 11;
            });

            onActionBlur(proxy.model.exchange_rate);
            break;

          case false:
            break;
        }
      });
    }

    /**
     * Hoãn
     * overide lại
     */
    async function postponeVoucher() {
      await proxy.super('postponeVoucher', baseDetailVoucher);
      selectedTabHandler(proxy.model.allocation_config);
    }

    /**
     * Click button sửa
     * NNLINH 06.05.2022
     */
    function onEditEvent() {
      // Check quyền Sửa (vqphong - 12/12/2022)
      proxy.checkActionPermissionAlert(proxy.$ms.constant.Permission.Edit);
      proxy.setFormMode(proxy.$ms.constant.FormState.Edit);
    }

    /**
     * Override để lấy thêm dữ liệu chứng từ khi mở form và gán giá trị mặc định 1 số trường
     * NNLINH 09.05.2022
     */
    async function bindData(data) {
      data.ref_type = data.ref_type || proxy.$ms.constant.RefType.BUPlanReceipt; // Mặc định nhận dự toán đầu năm
      data.currency_code = data.currency_code || proxy.$t('i18nEnum.Currency.VND');
      data.exchange_rate = data.exchange_rate || 1;
      // Gán ngày khi không tồn tại
      // tbngoc 12.06.2022
      data.posted_date = data.posted_date || proxy.postedDate;
      data.ref_date = data.ref_date || proxy.postedDate;
      data.allocation_config = data.allocation_config || 0; // mặc định ko phân bổ

      if (proxy.editMode == proxy.$ms.constant.FormState.Add) {
        let dbOptions = await proxy.$store.dispatch('dbOption/getDbOptions');
        if (dbOptions != null) {
          data.budget_chapter_code = dbOptions.DefaultBudgetChapterCode;
          data.budget_chapter_name = dbOptions.DefaultBudgetChapterName;
        }
      }

      this.bindBumasData(data);

      proxy.super('bindData', baseDetailVoucher, data);
      if (proxy.viewing) {
        if (proxy.model.is_posted) {
          stepsDynamic.value = steps.value.filter(x => x.state.includes('posted') || x.state.includes('default'));
        } else {
          stepsDynamic.value = steps.value.filter(x => x.state.includes('unposted') || x.state.includes('default'));
        }
      } else {
        stepsDynamic.value = steps.value.filter(x => x.state.includes('edit') || x.state.includes('default'));
      }
    }

    /**
     * Gán dữ liệu từ bumas
     * lttuan1 - 17.01.2024
     */
    function bindBumasData(data) {
      if (proxy._formParam && proxy._formParam.isBumas) {
        var listTask = proxy.$store.getters[`${ModuleTask}/items`];
        var listProject = proxy.$store.getters[`${ModuleProject}/items`];
        var listBudgetChapter = proxy.$store.getters[`${ModuleBudgetChapter}/items`];

        // lấy detail đầu tiên
        let listDetail = proxy._formParam.records.AllocationDecisionBudgetExpenseDetail.filter(
          x => x.estimate_amount != 0,
        );
        
        if (listDetail && listDetail.length > 0) {
          var firstRow = listDetail[0];
          // master
          data.ref_id = firstRow.allocation_superior_id ;  
          switch(firstRow.type_allocation){
            // bổ sung
            case 3:
              data.ref_type = proxy.$ms.constant.RefType.BUPlanSupplement;
              break;
            // đầu năm
            case 1:
            default:
              data.ref_type = proxy.$ms.constant.RefType.BUPlanReceipt;
              break;
          }
          data.decision_no = firstRow.decision_no.substring(0, 20);
          data.decision_date = firstRow.decision_date;
          data.budget_chapter_code = firstRow.budget_chapter_code;
          // Gán lại tên chương
          if (data.budget_chapter_code) {
            data.budget_chapter_name = listBudgetChapter.find(
              x => x.budget_chapter_code == data.budget_chapter_code,
            )?.budget_chapter_name;
          }
          data.allocation_config = 0;

          // Detail
          let i = 0;
          data.BUPlanReceiptDetails = listDetail.map(x => {
            x.ref_id = data.ref_id;
            x.description = x.expense_name || x.project_name;
            x.task_code = x.expense_code;
            x.task_id = x.task_code ? listTask.find(i => i.task_code == x.task_code)?.task_id : null;
            x.project_id = x.project_code ? listProject.find(i => i.project_code == x.project_code).project_id : null;
            x.state = proxy.$ms.constant.ModelState.Insert;
            x.method_distribute_type = 0;
            x.method_distribute_name = 'Dự toán';
            x.cash_withdraw_type_id = firstRow.type_allocation == 3 ? proxy.$ms.constant.CashWithDrawType.Supplement : proxy.$ms.constant.CashWithDrawType.PlanReceipt;
            x.cash_withdraw_type_name = firstRow.type_allocation == 3 ? 'Bổ sung' : 'Nhận dự toán';

            // mã CTMT, loại, khoản giữ nguyên
            // mục/ nhóm mục chi
            let isDetailBudgetItem = proxy.dbOptions.BudgetPlanReceiptMode;
            if (!isDetailBudgetItem) {
              x.budget_item_code = null;
            }
            x.budget_source_group_property_type = x.budget_source_property;
            // Gán nguồn map
            var budget_obj = proxy._formParam.mapBudget.find(
              el => el.budget_source_code == x.budget_source_code,
            );
            if (budget_obj) {
              x.budget_source_group_property_type = budget_obj.mapping_group_property_type;
              x.budget_source_id = budget_obj.mapping_source_id;
              x.budget_source_code = budget_obj.mapping_source_code;
              x.budget_source_name = budget_obj.mapping_source_name;
            }
            x.debit_account = getAccountBySourceGroupPropertyTypeBumas(x, x.item_type);
            x.amount_oc = x.estimate_amount;
            x.amount = x.estimate_amount;

            // gán lại tiền tháng 12 và quý 4
            x.amount_quater4 = x.estimate_amount;
            x.amount_quater4_oc = x.estimate_amount;
            x.amount_quater12 = x.estimate_amount;
            x.amount_quater12_oc = x.estimate_amount;
            x.sort_order = i;
            i++;
            return x;
          });

          // gen Hạch toán đồng thời
          proxy.generateParallel(true);
        }
      }
    }

    /**
     * Action click button Tiện ích
     * NNLINH 11.05.2022
     */
    const clickItemHandle = item => {
      switch (item.command) {
        case proxy.$ms.constant.Command.Duplicate:
          proxy.duplicate({id: proxy.model.ref_id});
          break;
        case proxy.$ms.constant.Command.ViewAccount:
          viewAccount(proxy);
          break;
        case proxy.$ms.constant.Command.Delete:
          proxy.delete(proxy.model);
          break;
        case proxy.$ms.constant.Command.Add:
          proxy.add({
            mode: proxy.$ms.constant.FormState.Add,
          });
          break;
        case proxy.$ms.constant.Command.AddAutoBusiness:
          proxy.saveAsNewAutoBusiness();
          break;
      }
      proxy.pushTrans(item.command);
    };

    /**
     * custom lại ref_type theo đúng chứng từ gốc khi nhân bản
     * dtnga3 (11.04.2025)
     */
    function customVoucherLoadData(result){
      var me = proxy;
      me.super('customVoucherLoadData', baseDetailVoucher, result);
      if(result && result.action == 'Duplicate'){
        if(result.param){
          var param = JSON.parse(result.param);
          if(param && (!param.RefTypeKey || param.RefTypeKey != me.model.ref_type)){
            param.RefTypeKey = me.model.ref_type;
            result.param = JSON.stringify(param);
          }
        }
      }
    }

    //#region config ẩn hiện cột và sự kiện liên quan đến combo Loại tiền
    const {columnsDataParalell} = useCurrencyShowColumn(proxy, columnParallel);
    const {configColumnParalell} = useActionParallel();

    /**
     * Override Lấy ra entity hạch toán đồng thời
     */
    function getParallelModel() {
      if (!this.gridDetailParallel) {
        return {};
      }
      return configColumnParalell;
    }

    const {onCurrencyComboboxLoadData, totalAmountComputed, assignValueCurrency} = useCurrencyCombo(
      comboboxDataRemote,
      comboboxLoadData,
      proxy,
      'BUPlanReceiptDetails',
      'Parallels',
    );
    //#endregion

    /**
     * Chọn config phân bổ
     * NNLINH 14.06.2022
     */
    function selectAllocationConfig(value) {
      if (proxy.editMode !== proxy.$ms.constant.FormState.View) {
        selectedTabHandler(value);
      }
    }
    /**
     * Selectab gắn lại layout
     * NNLINH 14.06.2022
     */
    const selectedTabHandler = async value => {
      await proxy.submitGridEditor();
      switch (value) {
        case 0:
          layoutTagDetail.value = 'BUPlanReceiptDetail';
          currentLayout.value = 'BUPlanReceiptDetail';
          break;
        case 1:
          layoutTagDetail.value = 'BUPlanReceiptDetailQuater';
          currentLayout.value = 'BUPlanReceiptDetailQuater';
          break;
        case 2:
          layoutTagDetail.value = 'BUPlanReceiptDetailMonth';
          currentLayout.value = 'BUPlanReceiptDetailMonth';
          break;
        default:
          break;
      }
      selectedTab.value = value;
    };

    /**
     * Danh sách máp từ chi tiết theo sang các field
     * NNkiem 19/07/2022
     */
    function getMapField() {
      let isDetalBudgetItem = proxy.dbOptions.BudgetPlanReceiptMode;
      return [
        {field: 'is_detail_by_budget_source', mapField: 'budget_source_name'},
        {
          field: 'is_detail_by_budget_kind_item',
          mapField: 'budget_sub_kind_item_code',
        },
        {
          field: 'is_detail_by_budget_item',
          mapField: !isDetalBudgetItem ? 'budget_group_item_code' : 'budget_item_code',
        },
        {field: 'is_detail_by_project', mapField: 'project_code'},
        {field: 'is_detail_by_bank_account', mapField: 'bank_account'},
        {
          field: 'is_detail_by_budget_sub_item',
          mapField: 'budget_sub_item_code',
        },
        {
          field: 'is_detail_by_method_distribute',
          mapField: 'method_distribute_name',
        },
        {
          field: 'is_detail_by_fee',
          mapField: 'budget_fees_code',
        },
      ];
    }
    /**
     * Enable Button Delete
     *
     */
    const disabledDelete = computed(() => {
      return proxy.editMode != proxy.$ms.constant.FormState.View || proxy.model.is_posted;
    });
    /**
     * Custom hiển thị thêm cột trên grid
     * NNLINH 14.06.2022
     */
    function customColumns(columns) {
      isFirst.value = false;
      if (proxy.model.currency_code && proxy.model.currency_code != proxy.$t('i18nEnum.Currency.VND')) {
        let columnAmontOc = amountOcColumnMapper.map(x => x.amount_oc);
        columns.forEach(item => {
          if (item.dataField == 'amount_oc') {
            item.formatType = proxy.$ms.constant.FormatType.AmountOC;
          }
          if (item.visible != false && columnAmontOc.includes(item.dataField)) {
            //lấy filed của trường quy đổi
            let fieldAmount = amountOcColumnMapper.filter(x => x.amount_oc == item.dataField)[0]?.amount;
            let colunmAmont = columns.filter(x => x.dataField == fieldAmount)[0];
            colunmAmont.visible = true;
          }
        });
      }
      // ẩn hiện cột mục hay nhóm mục
      let isDetalChapter = proxy.dbOptions.BudgetPlanReceiptMode;
      if (isDetalChapter) {
        var col = columns.filter(x => x.dataField == 'budget_group_item_code')[0];
        col.visible = false;
      } else {
        var col = columns.filter(x => x.dataField == 'budget_item_code')[0];
        col.visible = false;
      }
    }
    /**
     * Thêm mới 1 dòng mặc định
     * Created by nnkiem 18/7/2022
     */
    function initDataBeforeAddRow(dataRow, index) {
      let item = JSON.parse(JSON.stringify(dataRow));
      item.ref_detail_id = commonFn.generateUUID();
      item.state = this.$ms.constant.ModelState.Insert;
      //thêm từ 1 dòng có sẵn
      if (dataRow.state !== this.$ms.constant.ModelState.Empty) {
        amountOcColumnMapper.forEach(x => {
          item[x.amount] = 0;
          item[x.amount_oc] = 0;
        });
        delete item.amount;
      } else {
        // thêm từ 1 dòng trống
        let defaultValue = this.$store.state.dbOption.dbOptions;
        item.budget_kind_item_code = defaultValue?.DefaultBudgetKindItemCode;
        item.budget_sub_kind_item_code = defaultValue?.DefaultBudgetSubKindItemCode;
        item.budget_source_name = defaultValue?.DefaultBudgetSourceName;
        item.budget_source_id = defaultValue?.DefaultBudgetSourceId;
        item.description = proxy.model?.journal_memo;
      }

      return item;
    }

    const stepsDynamic = ref([]);
    /**
     * Dữ liệu step
     */
    const steps = ref([
      {
        target: '.step-1',
        header: {
          title: 'Chức năng Hướng dẫn',
        },
        state: ['default'],
        content: 'Xem hướng dẫn nhanh các thao tác trên màn hình chứng từ',
      },
      {
        target: '.step-2',
        header: {
          title: 'Phím tắt',
        },
        state: ['default'],
        content: 'Xem danh sách các phím tắt để thao tác nhanh trên phần mềm',
      },
      {
        target: '.step-3',
        header: {
          title: 'Tùy chỉnh giao diện',
        },
        state: ['default'],
        content: 'Thực hiện tùy chỉnh giao diện chứng từ theo nhu cầu',
      },
      {
        target: '.step-4',
        header: {
          title: 'Trợ giúp',
        },
        state: ['default'],
        content: 'Xem tài liệu hướng dẫn chi tiết nghiệp vụ',
      },
      {
        target: '.step-5',
        header: {
          title: 'Chọn Hình thức nhận dự toán',
        },
        state: ['edit'],
        content: 'Lựa chọn hình thức nhận dự toán: Đầu năm hoặc Bổ sung',
      },
      {
        target: '.step-6',
        header: {
          title: 'Phân bổ',
        },
        key: 6,
        state: ['edit'],
        content: `Chọn có Phân bổ hay không? Nếu có phân bổ, chọn Phân bổ theo Quý hoặc Theo Tháng. Chương trình sẽ tự động tính số tiền được phân bổ`,
      },
      {
        target: '.step-readjust',
        header: {
          title: 'Tùy chọn Chỉnh lý quyết toán',
        },
        key: 7,
        state: ['default'],
        content: `Tích chọn nếu chứng từ này là chứng từ trong khoảng thời gian chỉnh lý quyết toán`,
      },
      {
        target: '.ms-tbody .row-editor-action.insert',
        header: {
          title: 'Thêm dòng',
        },
        scroll: {},
        state: ['edit'],
        content: `Thêm nội dung dự toán được giao`,
      },
      {
        target: '.ms-tbody .row-editor-action.delete',
        header: {
          title: 'Xóa dòng',
        },
        scroll: {},
        state: ['edit'],
        content: `Xóa nội dung dự toán được giao`,
      },
      {
        target: '.step-close',
        header: {
          title: 'Chức năng',
        },
        state: ['edit'],
        content: `Thực hiện Cất để lưu chứng từ`,
      },

      {
        target: '.step-5-pos',
        header: {
          title: 'Tiện ích',
        },
        state: ['posted', 'unposted'],
        content: 'Tùy chọn các chức năng khác của chứng từ như: Thêm chứng từ mới, Xem số dư tài khoản,...',
      },
      {
        target: '.step-6-pos',
        header: {
          title: 'Chức năng In',
        },
        state: ['posted', 'unposted'],
        content: `Lựa chọn chứng từ để in hoặc thiết lập tùy chọn in theo lô`,
      },
      {
        target: '.step-7-posted',
        header: {
          title: 'Sửa nhanh',
        },
        state: ['posted'],
        content: `Thực hiện sửa một số thông tin chung trên chứng từ`,
      },
      {
        target: '.step-close',
        header: {
          title: 'Bỏ ghi',
        },
        state: ['posted'],
        content: `Bỏ ghi sổ chứng từ để sửa hoặc xóa chứng từ`,
      },
      {
        target: '.step-7-unposted',
        header: {
          title: 'Chức năng Xóa',
        },
        state: ['unposted'],
        content: `Xóa chứng từ hiện thời`,
      },
      {
        target: '.step-8-unposted',
        header: {
          title: 'Sửa',
        },
        state: ['unposted'],
        content: `Sửa chứng từ hiện thời`,
      },
      {
        target: '.step-close',
        header: {
          title: 'Ghi sổ',
        },
        state: ['unposted'],
        content: `Ghi sổ chứng từ hiện thời`,
      },
    ]);

    /**
     * Thay đổi step thì custom
     */
    function changeStep(index, step) {
      switch (step.key) {
        case 6:
          proxy.toggleAbove = true;
          break;
      }
      if (index == 0) {
        if(isAdjustment.value){
          steps.value.find(x => x.key == 7).hide = false;
        } else {
          steps.value.find(x => x.key == 7).hide = true;
        }
      }
    }
    /**
     * Sửa text nhóm mục chi
     * Created by NNkiem
     */
    const getMapDetailName = function () {
      let mapField = proxy.super('getMapDetailName', baseDetailVoucher);
      let isDetalBudgetItem = proxy.dbOptions.BudgetPlanReceiptMode;
      if (!isDetalBudgetItem && mapField) {
        mapField.is_detail_by_budget_item = 'Nhóm mục chi';
      }
      return mapField;
    };
    /**
     * Custom lại định khoản nhanh
     */
    const customDataRowGrid = function () {
      let isDetalBudgetItem = proxy.dbOptions.BudgetPlanReceiptMode;
      if (!isDetalBudgetItem) {
        let selectedRowIndex = proxy.model.BUPlanReceiptDetails.findIndex(
          x => x.selected && x.state !== proxy.$ms.constant.ModelState.Delete,
        );
        selectedRowIndex = selectedRowIndex < 0 ? 0 : selectedRowIndex;
        proxy.model.BUPlanReceiptDetails[selectedRowIndex].budget_group_item_code = null;
        proxy.model.BUPlanReceiptDetails[selectedRowIndex].group_item_code = null;
      }
    };

    // const eventQuickEditVoucher = function() {
    //   proxy.isQuickEditVoucher = true;
    // };
    const changeTriggers = shallowRef([
      'project_code',
      'amount_oc',
      'budget_sub_kind_item_code',
      'budget_kind_item_code',
      'budget_group_item_code',
      'budget_item_code',
      'budget_sub_item_code',
      'budget_source_name',

      'amount_quater1_oc',
      'amount_quater2_oc',
      'amount_quater3_oc',
      'amount_quater4_oc',
      'amount_month1_oc',
      'amount_month2_oc',
      'amount_month3_oc',
      'amount_month4_oc',
      'amount_month5_oc',
      'amount_month6_oc',
      'amount_month7_oc',
      'amount_month8_oc',
      'amount_month9_oc',
      'amount_month10_oc',
      'amount_month11_oc',
      'amount_month12_oc',
      'project_expense_code',
    ]);
    /**
     * Custom tham số xóa chứng từ
     * TPNAM 28.02.2024
     */
    function getParamDeleteDetail(tempArr) {
      return [...tempArr.map(({ref_id, ref_no, ref_type}) => ({ref_id, ref_no, ref_type}))];
    }

    /**
     * gán lại tk Nợ khi thay đổi check chọn Chỉnh lý quyết toán
     * dtnga3 (22.05.2024)
     */
    function onChangeAdjustment(value) {
      proxy.model.BUPlanReceiptDetails.forEach(row => {
        if (row.state !== proxy.$ms.constant.ModelState.Empty && row.state !== proxy.$ms.constant.ModelState.Delete) {
          row.debit_account = getAccountBySourceGroupPropertyTypeAndAdjustment(row, value);
        }
      });
    }
    /**
     * Mặc định lại nghiệp vụ trên hạch toán khi thay đổi nghiệp trên master
     * dtnga3 (14/06/2024)
     */
    async function changeVoucher(event) {
      var cashWithdrawTypeId = '';
      var cashWithdrawTypeName = '';
      if (proxy.model.ref_type === proxy.$ms.constant.RefType.BUPlanSupplement) {
        cashWithdrawTypeId = proxy.$ms.constant.CashWithDrawType.Supplement;
        cashWithdrawTypeName = 'Bổ sung';
      } else {
        cashWithdrawTypeId = proxy.$ms.constant.CashWithDrawType.PlanReceipt; // nghiệp vụ
        cashWithdrawTypeName = 'Nhận dự toán';
      }

      proxy.model.BUPlanReceiptDetails?.filter(x => x.state !== proxy.$ms.constant.ModelState.Delete).forEach(x => {
        if (x.cash_withdraw_type_id) {
          x.cash_withdraw_type_id = cashWithdrawTypeId;
          x.cash_withdraw_type_name = cashWithdrawTypeName;
        }
      });
      proxy.model.Parallels?.filter(x => x.state !== proxy.$ms.constant.ModelState.Delete).forEach(x => {
        if (x.cash_withdraw_type_id) {
          x.cash_withdraw_type_id = cashWithdrawTypeId;
          x.cash_withdraw_type_name = cashWithdrawTypeName;
        }
      });
    }

    /**
     * Kiểm tra xem dòng hạch toán hiện tại có map với hạch toán đã sinh theo rule k => base sẽ check các thông tin cơ bản
     * Đoạn này dev override về tự check theo điều kiện nếu khác mặc định
     * dtnga3 (17.06.2024) check riêng vì 1 số cột Hạch toán đồng thời có mà tab Hạch toán không có (Tiểu mục, Tiết tiểu mục, Phí lệ phí)
     */
    function hasItemMapParallelForRule(parallels, item) {
      const me = this;

      //Một số trường đang so sánh == để khi rơi vào trường hợp so sánh undefined với null vẫn đúng
      let itemValid = parallels.find(
        x =>
          x[me.$ms.constant.ColumnCommon.orgRefDetailId] &&
          item[me.$ms.constant.ColumnCommon.orgRefDetailId] &&
          x[me.$ms.constant.ColumnCommon.orgRefDetailId].toLowerCase() ===
            item[me.$ms.constant.ColumnCommon.orgRefDetailId].toLowerCase() &&
          x[me.$ms.constant.ColumnCommon.amount] == item[me.$ms.constant.ColumnCommon.amount] &&
          x[me.$ms.constant.ColumnCommon.amountOc] == item[me.$ms.constant.ColumnCommon.amountOc] &&
          x[me.$ms.constant.ColumnCommon.budgetSourceId] &&
          item[me.$ms.constant.ColumnCommon.budgetSourceId] &&
          x[me.$ms.constant.ColumnCommon.budgetSourceId].toLowerCase() ===
            item[me.$ms.constant.ColumnCommon.budgetSourceId].toLowerCase() &&
          x[me.$ms.constant.ColumnCommon.cashWithdrawTypeId] ===
            item[me.$ms.constant.ColumnCommon.cashWithdrawTypeId] &&
          x[me.$ms.constant.ColumnCommon.methodDistributeType] ===
            item[me.$ms.constant.ColumnCommon.methodDistributeType] &&
          ((!x[me.$ms.constant.ColumnCommon.debitAccount] && !item[me.$ms.constant.ColumnCommon.debitAccount]) ||
            x[me.$ms.constant.ColumnCommon.debitAccount] === item[me.$ms.constant.ColumnCommon.debitAccount]) &&
          ((!x[me.$ms.constant.ColumnCommon.creditAccount] && !item[me.$ms.constant.ColumnCommon.creditAccount]) ||
            x[me.$ms.constant.ColumnCommon.creditAccount] === item[me.$ms.constant.ColumnCommon.creditAccount]) &&
          x[me.$ms.constant.ColumnCommon.budgetChapterCode] == item[me.$ms.constant.ColumnCommon.budgetChapterCode] &&
          x[me.$ms.constant.ColumnCommon.budgetSubKindItemCode] ==
            item[me.$ms.constant.ColumnCommon.budgetSubKindItemCode] &&
          x[me.$ms.constant.ColumnCommon.budgetItemCode] == item[me.$ms.constant.ColumnCommon.budgetItemCode] &&
          x[me.$ms.constant.ColumnCommon.budgetSubItemCode] == item[me.$ms.constant.ColumnCommon.budgetSubItemCode] &&
          x[me.$ms.constant.ColumnCommon.projectCode] == item[me.$ms.constant.ColumnCommon.projectCode] &&
          x[me.$ms.constant.ColumnCommon.topicCode] == item[me.$ms.constant.ColumnCommon.topicCode] &&
          x[me.$ms.constant.ColumnCommon.statisticCode] == item[me.$ms.constant.ColumnCommon.statisticCode] &&
          x[me.$ms.constant.ColumnCommon.taskCode] == item[me.$ms.constant.ColumnCommon.taskCode],
      );
      if (itemValid) {
        return true;
      }
      return false;
    }

    /**
     * Hàm ngầm định cột Nghiệp vụ và Cấp phát trước khi chọn Định khoản nhanh
     * bhtuyen 19/12/2024
     */
    function beforeBindDataAutoBusiness(res){
      res.forEach(grid => {
        grid.forEach((detail) => {
          // nghiệp vụ
          if (proxy.model.ref_type === proxy.$ms.constant.RefType.BUPlanSupplement) {
            detail.cash_withdraw_type_id = proxy.$ms.constant.CashWithDrawType.Supplement;
            detail.cash_withdraw_type_name = 'Bổ sung';
          } else {
            detail.cash_withdraw_type_id = proxy.$ms.constant.CashWithDrawType.PlanReceipt; // nghiệp vụ
            detail.cash_withdraw_type_name = 'Nhận dự toán';
          }
          // cấp phát
          detail.method_distribute_type = proxy.$ms.constant.MethodDistributeType.Budget;
          detail.method_distribute_name = 'Dự toán';
          detail.budget_chapter_code = proxy.model.budget_chapter_code;
        });
      })
    }

    return {
      viewAccount,
      changeTriggers,
      //tên router form danh sách khi đóng sẽ quay lại
      backRouter: '/treasury/buplanreceipt',
      module,
      layoutTagDetail,
      currentLayout,
      toggleAbove,
      toggleAboveHandler,
      buttonUtilities,
      buttonPrints,
      propsData,
      selectedTab, //Tab đang được active
      selectedTabHandler,
      comboboxDataRemote,
      budgetChapterAPI,
      currencyAPI,
      budgetChapterColumns,
      currencyColumns,
      comboboxLoadData,
      submitQuickAdd,
      selectedChapter,
      changeDataBusiness,
      postponeVoucher,

      onAllocationEvent,
      selectedCurrency,
      onEditEvent,
      bindData,
      clickItemHandle,
      selectCurrency,
      onActionBlur,
      onCurrencyComboboxLoadData,
      customSubmitParam,
      onBudgetChapterComboboxLoadData,
      selectAllocationConfig, //Chọn option phân
      customColumns,
      currencyCode,
      isFirst,
      amountOcColumnMapper,
      disabledDelete,
      refType,
      clickQuickAccounting,
      accountingActions,
      addAutoBusiness,
      saveAsNewAutoBusiness,
      getMapField,
      toggleAboveHandlerGrid,
      totalAmountComputed,
      assignValueCurrency,
      customDefaultData,
      onBlurActionDatePicker,
      getConfigLayout,
      initDataBeforeAddRow,
      currencyCode,
      copyDownRow,
      copyDownRowExtend,
      copyActionClick,
      // guide,
      steps,
      // showStep,
      changeStep,
      getMapDetailName,
      subSystemCode,
      clearFields,
      customDataRowGrid,
      quickSearchParam,
      // eventQuickEditVoucher,
      configVoucherQuickEdit,
      stepsDynamic,
      DBStartDateString: proxy.DBStartDateString,
      bindBumasData,
      titleCode,
      getParamDeleteDetail,
      isAdjustment,
      onChangeAdjustment,
      configParallelGrid,
      columnsDataParalell,
      propsDataParalell,
      changeTriggerParallels,
      getParallelModel,
      onPosted,
      customUnPostedSuccess,
      changeVoucher,
      hasItemMapParallelForRule,
      beforeBindDataAutoBusiness,
      customVoucherLoadData
    };
  },
};
</script>
<style lang="scss">
.bu-plan-receipt-detail {
  @import './BUPlanReceiptDetail.scss';
  .allocation {
    margin-right: 20px;
  }

  .align-center {
    align-items: center;
  }
}
</style>

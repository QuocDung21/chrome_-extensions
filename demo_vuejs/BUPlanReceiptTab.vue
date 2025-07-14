<template>
  <div class="bu-plan-receipt-tab">
    <div class="budget-container flex-column">
      <div
        class="flex-column master-section"
        :style="['height: ' + heightResize + '%']"
        :class="{'point-event-none': isHandlerDragging, 'none-detail': !this.dbOptions?.VisibleMasterDetail}"
      >
        <div class="height-title-top title flex-between plr-20">
          <div class="title-bold">{{ name }}</div>
          <div class="d-flex">
            <ms-button
              text="Hướng dẫn"
              type="icon-button"
              class="btn-guide"
              leftIcon="ic-guide"
              @click="guide"
              tooltipIconLeft="Hướng dẫn chức năng"
            />

            <ms-tour
              :steps="steps"
              v-model:open="showStep"
              :filterShow="true"
              container=".bu-plan-receipt-tab"
            ></ms-tour>
            <ms-button
              text="Phím tắt"
              tooltipIconLeft="Phím tắt"
              type="icon-button"
              class="btn-guide"
              leftIcon="ic-shortkey"
              @click="ActionShortkeyList"
            />
            <ms-button
              v-show="useBumas"
              text="Thêm từ quyết định giao dự toán"
              :hasBorder="true"
              type="outline-button circle-button"
              class="mr-2"
              @click="addFromBumas"
            />
            <ms-button text="Thêm" class="add circle-button" @click="add" shortkey-target="Add"> </ms-button>
          </div>
        </div>
        <div class="height-title-bottom flex-between plr-20 bg-white">
          <div class="left-toolbar">
            <div class="icon24 icon left down-arrow ml-2" :disabled="!statusBatchExcution"></div>

            <menu-wrapper class="topnav-widget-more-container">
              <template #menu-button="{toggleMenu}">
                <ms-button
                  :disabled="!statusBatchExcution"
                  text="Thực hiện hàng loạt"
                  tooltipIconRight="Hiển thị chi tiết"
                  :hasBorder="true"
                  type="outline-button circle-button btn-multi-action"
                  rightIcon="down-arrow-black"
                  @click="toggleMenu"
                />
              </template>
              <template #menu-content>
                <menu-item @menu-item-click="handlerActionMulti({command: $ms.constant.Command.Delete})">Xóa</menu-item>
                <menu-item @menu-item-click="handlerActionMulti({command: $ms.constant.Command.Posted})"
                  >Ghi sổ</menu-item
                >
                <menu-item
                  @menu-item-click="
                    handlerActionMulti({
                      command: $ms.constant.Command.UnPosted,
                    })
                  "
                  >Bỏ ghi</menu-item
                >
              </template>
            </menu-wrapper>
            <ms-filter-grid
              v-model="filterGrid.value"
              v-model:display="filterGrid.payload"
              ref="gridFilter"
              class="ml-2"
              :controls="filterGrid.controls"
              @submit="updateFilter"
            >
            </ms-filter-grid>
          </div>
          <div class="right-toolbar flex-row">
            <ms-button
              type="icon-button"
              leftIcon="refresh-black-big"
              title="Lấy lại dữ liệu"
              shortkey-target="Refresh"
              @click="refresh"
              class="mr-1"
            />
            <ms-button type="icon-button" leftIcon="message-black-big" title="Email" class="mr-1" />
            <ms-button
              type="icon-button"
              leftIcon="print-black-big"
              title="In"
              @click="printList"
              class="mr-1"
              shortkey-target="Print"
            />
            <div
              class="button icon24 setting-small-list mr-1"
              v-tooltip="'Tùy chỉnh giao diện'"
              @click="clickSettingLayout"
              shortkey-target="ConfigLayout"
            ></div>
            <a :href="$tm('i18nHelpLink.BUPlanReceipt')" target="blank"
              ><ms-button type="icon-button" leftIcon="help" class="mr-1" v-tooltip="'Trợ giúp'" shortkey-target="Help"
            /></a>
          </div>
        </div>
        <div class="flex" :class="{'bg-white': this.dbOptions?.VisibleMasterDetail}">
          <ms-grid-viewer
            :ref="viewRef"
            :data="items"
            :pageTotal="total"
            :loading="loading"
            class="plr-20 bg-white"
            idField="ref_id"
            multiple
            :filterable="true"
            :customFilter="filterGrid.payload"
            v-model:selected="gridInfo.selected"
            hasBindingFilterHeader
            v-on="_gridEvent"
            :pageSize="gridInfo.pageSize"
            :footer="true"
            :summary="summary"
            @viewLinkedForm="
              (col, dataRow) => {
                viewLinkedForm(col, dataRow);
              }
            "
            @grid_styleColumn="
              (col, dataRow, styleObject) => {
                onGridStyleColumn(col, dataRow, styleObject, this);
              }
            "
            @loadFilter="
              (payload, row, column) => {
                loadComboboxHeader(payload, row, column);
              }
            "
            pagination
            :lineBreak="this.dbOptions?.LineBreak ?? 1"
            @resizeStop="onResizeStop"
          >
            <!-- <template #widget-title>
      Thao tác
    </template> -->
            <template #widget-title-th="{rowspan}">
              <th class="ms-th widget-title" :rowspan="rowspan" style="width: 105px; min-width: 105px">
                {{ $t('i18nInventoryItem.List.ActionColumn') }}
              </th>
            </template>
            <template #widget-body="{record}">
              <div class="widget-container">
                <div class="widget-primary" @click="gridRowActionClick(grid, $ms.constant.Command.View, record)">
                  {{ this.checkDateClose(record) ? 'Xem' : 'Xem/Sửa' }}
                </div>
                <menu-wrapper class="widget-more-container">
                  <template #menu-button="{toggleMenu}">
                    <button @click="toggleMenu" class="widget-more border"></button>
                  </template>
                  <template #menu-content>
                    <menu-item @menu-item-click="gridRowActionClick(grid, $ms.constant.Command.Duplicate, record)"
                      >Nhân bản</menu-item
                    >
                    <menu-item
                      v-if="!this.checkDateClose(record)"
                      @menu-item-click="gridRowActionClick(grid, $ms.constant.Command.Delete, record)"
                      seperatorBottom
                      >Xóa</menu-item
                    >
                    <menu-item
                      v-if="!record.is_posted && !this.checkDateClose(record)"
                      @menu-item-click="gridRowActionClick(grid, $ms.constant.Command.Posted, record)"
                      >Ghi sổ</menu-item
                    >
                    <menu-item
                      v-if="record.is_posted && !this.checkDateClose(record)"
                      @menu-item-click="gridRowActionClick(grid, $ms.constant.Command.UnPosted, record)"
                      >Bỏ ghi</menu-item
                    >
                  </template>
                </menu-wrapper>
              </div>
            </template>
          </ms-grid-viewer>
        </div>
      </div>
      <div
        class="detail-section"
        :class="{'point-event-none': isHandlerDragging}"
        v-show="this.dbOptions?.VisibleMasterDetail"
      >
        <div class="divider-section">
          <div class="slide-line" @mouseup="resizeOffDetail" @mousedown="resizeOnDetail">
            <div class="resize-icon"></div>
            <div class="resize-icon second"></div>
          </div>
          <div
            class="toggle-above"
            :class="{expand: !toggleAbove}"
            :tabindex="-1"
            @click="collapseHandler"
            v-tooltip="'Mở rộng'"
            v-if="toggleAbove"
          ></div>
          <div
            class="toggle-above"
            :class="{expand: !toggleAbove}"
            :tabindex="-1"
            @click="collapseHandler"
            v-tooltip="'Thu nhỏ'"
            v-if="!toggleAbove"
          ></div>
        </div>

        <div class="flex mt-13px position-relative">
          <ms-grid-viewer
            :ref="refListDetail"
            :data="itemDetail"
            :pageTotal="total"
            v-model:selected="gridInfo.selected"
            :loading="loading"
            class="plr-20 bg-white pt-3px"
            idField="ref_detail_id"
            :multiple="false"
            hasBindingFilterHeader
            :pageSize="gridInfo.pageSize"
            :footer="true"
            :filterable="false"
            :pagination="false"
            :lineBreak="this.dbOptions?.LineBreak ?? 1"
            sortMode="local"
            v-show="itemDetail && itemDetail.length > 0"
          >
          </ms-grid-viewer>
          <div class="data-notfound" v-show="!itemDetail || itemDetail.length == 0" :class="{'d-none': !toggleAbove}">
            <img src="@/assets/images/empty/bg_report_nodata.svg" />
            <div>Không có dữ liệu</div>
          </div>
        </div>
      </div>
    </div>

    <button shortkey-target="View" @click="onActionShortKeyOnGrid($ms.constant.Command.View)" class="d-none" />
    <button shortkey-target="Edit" @click="onActionShortKeyOnGrid($ms.constant.Command.Edit)" class="d-none" />
    <button
      shortkey-target="Duplicate"
      @click="onActionShortKeyOnGrid($ms.constant.Command.Duplicate)"
      class="d-none"
    />
    <button shortkey-target="Delete" @click="onActionShortKeyOnGrid($ms.constant.Command.Delete)" class="d-none" />
  </div>
</template>

<script>
import {reactive, ref, getCurrentInstance, defineComponent, onMounted, computed} from 'vue';
import BaseVoucherList from '@/views/base/baseVoucherList';
import BaseList from '@/views/base/baseList';
import msGridViewer from '@/components/gridViewer/MsGridViewer.vue';
import MenuItem from '@/components/dropdown/MenuItem.vue';
import MenuWrapper from '@/components/dropdown/MenuWrapper.vue';
import DateRange from '../../../views/report/parameters/components/DateRange.vue';
import {useLoadingTab} from '@/setup/utilities/loadingTab';
import {ModuleBuPlanReceipt} from '@/stores/moduleConst';
import {useActionGridEditor} from '@/commons/gridColumn/ActionGridEditor.js';
import MsFilterGrid from '@/components/filter/MsFilterGrid.vue';
import MsTour from '@/components/tour/MsTour.vue';
import {useResizeMasterDetail} from '@/components/virtualScroller/commonResizeMasterDetail.js';
import _ from 'lodash';
import MsTrVue from '@/components/gridViewer/MsTr.vue';
import bUPlanImportBumasAPI from '@/apis/bu/bUPlanImportBumasAPI';
import popupUtil from '@/commons/popupUtil';
import {collectionMonitor} from '@/setup/utilities/monitor.js';

export default defineComponent({
  extends: BaseVoucherList,
  components: {
    DateRange,
    msGridViewer,
    MenuItem,
    MenuWrapper,
    MsFilterGrid,
    MsTour,
  },
  props: {
    name: {
      default: '',
      type: String,
    },
  },
  setup() {
    const titleCode = 'tab_treasury_buplanreceipt';

    //Variable
    const {proxy} = getCurrentInstance();
    //Cấu hình module => dùng để map api query lên server
    const module = ModuleBuPlanReceipt;
    //Cấu hình load layout
    const layoutTag = 'BUPlanReceiptTab';
    // cấu hình layout in ds
    const configLayout =
      '[{"title":"Ngày hạch toán","width":105,"caption":"Ngày HT","dataField":"posted_date","filterable":true,"formatType":14},{"title":"Số quyết định","width":136,"caption":"Số quyết định","dataField":"decision_no","filterable":true},{"title":"Ngày quyết định","width":136,"caption":"Ngày quyết định","dataField":"decision_date","filterable":true,"formatType":14},{"caption":"Diễn giải","dataField":"journal_memo","filterable":true},{"width":136,"caption":"Số tiền","dataField":"total_amount","filterable":true,"formatType":2,"summaryType":"sum"},{"enum":"RefType","width":220,"caption":"Loại chứng từ","dataField":"ref_type","filterable":true,"formatType":100,"filterValue":[51,52]}]';
    //Định nghĩa tên form detail => dùng show form detail
    const formDetailName = 'BUPlanReceiptDetail';

    //Định nghĩa tên form popup Duyệt
    const formApproveName = 'ApproveVoucherBUPlanReceipt';

    const alwayTakeColumns = ['is_posted', 'currency_code', 'ref_type', 'ref_no'];

    const {onGridStyleColumn} = useActionGridEditor(proxy);

    const subSystemCode = proxy.$ms.constant.SubSystemCode.BUPlanReceipt;

    const {
      isHandlerDragging,
      heightResize,
      resizeOffDetail,
      resizeOnDetail,
      collapseHandler,
      toggleAbove,
      selectedTab,
      selectedTabHandler,
      updateDataList,
    } = useResizeMasterDetail(proxy);
    /**
     * Xử lý trạng thái button thực hiện hàng loạt
     * DQDAT1 06.05.2022
     */
    const statusBatchExcution = computed(() => {
      let data = proxy.items;
      if (data.length >= 1) {
        return true;
      }
      return false;
    });

    /**
     * Override customPayload
     * Thêm điều kiện filter cho payload
     * ref_type != BUPlanCancel: Hủy dự toán
     * NNLinh 09.05.2022
     */
    function customPayload(payload) {
      let extend = {
        Field: 'ref_type',
        Operator: '!=',
        Value: proxy.$ms.constant.RefType.BUPlanCancel,
      };
      payload.filter = payload.filter.concat(extend);

      if (payload.sort) {
        if (!payload.sort.includes('posted_date')) {
          payload.sort += ',posted_date DESC';
        } else if (!payload.sort.includes('decision_no')) {
          payload.sort += ',decision_no';
        } else if (!payload.sort.includes('decision_date')) {
          payload.sort += ',decision_date DESC';
        }
      } else {
        payload.sort = 'posted_date DESC,decision_no,decision_date DESC';
      }
    }

    /**
     * override lại hàm getFormDetailName
     * Do có 2 ref_type trên 1 form detail
     * NNLINH 17.05.2022
     */
    function getFormDetailName(record) {
      return formDetailName;
    }

    /**
     * Config biến lưu giá trị filter
     * NNLINH 06.06.2022
     */
    const filter = reactive({
      posted_state: 3,
      date_range: {
        period: 45,
        periodText: 'Tháng này',
      },
    });

    /**
     * Custom lại combobox filter loại
     * Created by NNKiem 21/07/2022
     */
    const getFilterGrid = () => {
      let controls = proxy.super('getFilterGrid', BaseVoucherList);
      let controlRefType = controls.find(x => x.field == 'ref_type');
      if (controlRefType) {
        controlRefType.values = [51, 52];
      }
      return controls;
    };

    function customDetailParam(param) {
      param.options = {
        submit: (result, param, action) => {
          updateDataList(result, param, action);
        },
      };
      param.formApproveName = formApproveName;
      proxy.super('customDetailParam', BaseVoucherList, param);
    }
    /**
     * Lấy dữ liệu thông tin báo cáo
     * NMQUANG1 10.12.2022
     */
    function getReportInfo() {
      return {
        reportId: 'PrintListLandscape',
        reportName: 'Danh sách chứng từ nhận dự toán',
        reportType: 'BUPlanReceiptEntity',
        IsShowSummaryFooter: true,
      };
    }
    /**
     * Lấy dữ liệu tham số báo cáo khi không dùng form tham số
     */
    function reportDataParam() {
      let param = {
        filter: proxy.lastParam.filter || '[]',
        sort: proxy.lastParam.sort,
        columns: proxy.lastParam.columns,
        config: configLayout,
      };
      return param;
    }

    /**
     * Khởi tạo step
     */
    function initSteps() {
      proxy.super('initSteps', BaseList);
      let steps = _.cloneDeep(proxy.stepData);
      proxy.contentStep(
        steps.find(x => x.key == 1),
        ['Xóa', 'Ghi sổ', 'Bỏ ghi'],
      );

      proxy.contentStep(
        steps.find(x => x.key == 3),
        ['Xem', 'Nhân bản', 'Xóa'],
        true,
      );

      proxy.stepData = steps;
    }
    /**
     * custom hàm ẩn hiện column theo dbOption
     * NXCHIEN 19.06.2023
     */
    function applyColumnByDbOptionCustom(columns, dbOptions) {
      proxy.super('applyColumnByDbOptionCustom', BaseVoucherList, columns, dbOptions);
      let isDetalChapter = dbOptions.BudgetPlanReceiptMode;
      switch (columns.dataField) {
        case 'budget_group_item_code':
          columns.visible = isDetalChapter ? false : true; // isDetalChapter giá trị 0, 1
          break;
        case 'budget_item_code':
          columns.visible = isDetalChapter ? true : false;
          break;
      }
    }
    /**
     * override ẩn hiện cột quy đổi
     * TPNAM 22.06.2023
     */
    function loadDataDetail(row, columns) {
      // ẩn hiện cột số tiền quy đổi nếu chứng từ có tiền ngoại tệ
      if (row.currency_code != 'VND') {
        columns.forEach(x => {
          switch (x.dataField) {
            case 'amount':
              x.visible = true;
              break;
          }
        });
        proxy.gridDetail.initColumns(columns);
      }
      let columnParams = columns.map(x => x.dataField).join();
      // load dữ liệu vào grid detail
      let payload = {refId: row.ref_id, refType: row.ref_type, columns: columnParams};
      proxy.$store.dispatch(`${proxy.module}/getListDetail`, payload).then(res => {
        if (res) {
          proxy.itemDetail = res;
          proxy.itemTabMaster = row;
        } else {
          proxy.itemDetail = [];
          proxy.itemTabMaster = {};
        }
      });
    }

    /**
     * Xử lý ẩn hiện button thêm từ qđ giao dự toán
     * pqkhanh 01.03.2023
     */
    const useBumas = computed(() => {
      if (proxy.dbOptions.UseBumas) {
        return true;
      }
      return false;
    });

    /**
     * Thêm từ quyết định giao dự toán (Bumas)
     */
    const addFromBumas = async item => {
      var checkConnectBumas = await proxy.$ms.commonFn.checkConnectBumas();
      if(!checkConnectBumas){
        return;
      }
      var year = proxy.postedDate.getFullYear();
      proxy.$ms.commonFn.mask();
      await bUPlanImportBumasAPI
        .checkSyncDictionaryBumas(year)
        .then(async checkSync => {
          if (!checkSync.SyncBudgetFees || !checkSync.SyncProjects || !checkSync.SyncMissions) {
            proxy.$ms.commonFn.unmask();
            popupUtil.show('ValidateSyncDictionaryPopup', {
              syncBudgetFees: checkSync.SyncBudgetFees,
              syncProjects: checkSync.SyncProjects,
              syncMissions: checkSync.SyncMissions,
              voucherName : "Nhận dự toán"
            });
          } else {
            // check quyền Thêm (vqphong - 12/12/2022)
            proxy.checkActionPermissionAlert(proxy.$ms.constant.Permission.Add);
            popupUtil.show('BUPlanReceiptFromBumasPopup', {
              mode: proxy.$ms.constant.FormState.Add,
              param: statusBatchExcution.value,
              listData: proxy.items,
              callBackRefresh: proxy.refresh,
            });
          }
        })
        .catch(err => {
          proxy.$ms.commonFn.unmask();
        });
      const {pushTrans} = collectionMonitor();
      pushTrans(
        proxy.$ms.constant.Command.GetBumasDecision,
        'Lấy quyết định giao từ Bumas',
        proxy.$ms.constant.Command.GetBumasDecision + "/" + proxy.module,
      );
    };
    /**
     * Custom tham số xóa chứng từ
     * TPNAM 28.02.2024
     */
    function getParamDelete(records){
      return [...records.map(({ ref_id, ref_no, ref_type }) => ({ ref_id, ref_no, ref_type }))];
    }

    return {
      titleCode,
      module,
      layoutTag,
      formDetailName,
      statusBatchExcution, // Trạng thái enable/disable button Thực hiện hàng loạt
      customPayload,
      getFormDetailName,
      filter,
      alwayTakeColumns,
      onGridStyleColumn,
      customDetailParam,
      getFilterGrid,
      reportDataParam,
      getReportInfo,
      subSystemCode,
      initSteps,
      heightResize,
      isHandlerDragging,
      resizeOffDetail,
      resizeOnDetail,
      collapseHandler,
      toggleAbove,
      selectedTabHandler,
      selectedTab,
      applyColumnByDbOptionCustom,
      loadDataDetail,
      // loadComboboxHeader
      useBumas,
      addFromBumas,
      getParamDelete
    };
  },
});
</script>

<style lang="scss">
@import './BUPlanReceiptTab.scss';
</style>

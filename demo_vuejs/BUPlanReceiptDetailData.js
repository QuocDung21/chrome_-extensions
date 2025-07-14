import {reactive, getCurrentInstance, ref, watch, computed} from 'vue';
import {useRemoteCombobox} from '@/setup/remoteCombobox.js';
import {useInitActionCombo} from '../../../commons/combobox/initActionCombo.js';
import {useAccountCustomComboGrid} from '../../../commons/combobox/accountCustomComboGrid.js';
import {usefilterActionCombo} from '../../../commons/combobox/filterActionCombo.js';
import api from '@/apis/di/accountAPI.js';

import {useCacheAccountComboConfig} from '@/commons/combobox/cacheCombo/cacheAccountComboConfig.js';
import {useCacheBudgetSourceComboConfig} from '@/commons/combobox/cacheCombo/cacheBudgetSourceComboConfig.js';
import {useCacheBudgetGroupItemComboConfig} from '@/commons/combobox/cacheCombo/cacheBudgetGroupItemComboConfig.js';
import {useCacheBudgetChapterComboConfig} from '@/commons/combobox/cacheCombo/cacheBudgetChapterComboConfig.js';
import {useCacheBudgetKindItemComboConfig} from '@/commons/combobox/cacheCombo/cacheBudgetKindItemComboConfig.js';
import {useCacheBudgetItemComboConfig} from '@/commons/combobox/cacheCombo/cacheBudgetItemComboConfig.js';
import {useCacheProjectComboConfig} from '@/commons/combobox/cacheCombo/cacheProjectComboConfig.js';
import {useCacheAccountingObjectComboConfig} from '@/commons/combobox/cacheCombo/cacheAccountingObjectComboConfig.js';
import {useCacheActivityComboConfig} from '@/commons/combobox/cacheCombo/cacheActivityComboConfig.js';
import {useCacheStatisticComboConfig} from '@/commons/combobox/cacheCombo/cacheStatisticComboConfig.js';
import {useCacheBankInfoComboConfig} from '@/commons/combobox/cacheCombo/cacheBankInfoComboConfig.js';
import {useCacheContractComboConfig} from '@/commons/combobox/cacheCombo/cacheContractComboConfig.js';
import {useCacheTopicComboConfig} from '@/commons/combobox/cacheCombo/cacheTopicComboConfig.js';
import {useCacheTaskComboConfig} from '@/commons/combobox/cacheCombo/cacheTaskComboConfig.js';
import {useCacheBudgetProvideComboConfig} from '@/commons/combobox/cacheCombo/cacheBudgetProvideComboConfig.js';
import {useCacheFundStructureComboConfig} from '@/commons/combobox/cacheCombo/cacheFundStructureComboConfig.js';
import {useCacheFundComboConfig} from '@/commons/combobox/cacheCombo/cacheFundComboConfig.js';
import {useCacheBudgetFeesComboConfig} from '@/commons/combobox/cacheCombo/cacheBudgetFeesComboConfig.js';
import _ from 'lodash';
import {ModuleAccountCombo} from '@/stores/moduleConst';

export const useBudgetPlanReceiptDetailData = proxy => {
  const {comboboxLoadData, submitQuickAdd} = useRemoteCombobox();

  const {extendFilter} = usefilterActionCombo();

  /**
   * Ẩn hiện container trên
   */
  const toggleAbove = ref(true);
  const toggleAboveHandler = () => {
    toggleAbove.value = !toggleAbove.value;
  };
  // danh sách để map cột tiền với tiền quy đổi
  const amountOcColumnMapper = [
    {
      amount: 'amount',
      amount_oc: 'amount_oc',
    },
    {
      amount: 'amount_quater1',
      amount_oc: 'amount_quater1_oc',
    },
    {
      amount: 'amount_quater2',
      amount_oc: 'amount_quater2_oc',
    },
    {
      amount: 'amount_quater3',
      amount_oc: 'amount_quater3_oc',
    },
    {
      amount: 'amount_quater4',
      amount_oc: 'amount_quater4_oc',
    },
    {
      amount: 'amount_month1',
      amount_oc: 'amount_month1_oc',
    },
    {
      amount: 'amount_month2',
      amount_oc: 'amount_month2_oc',
    },
    {
      amount: 'amount_month3',
      amount_oc: 'amount_month3_oc',
    },
    {
      amount: 'amount_month4',
      amount_oc: 'amount_month4_oc',
    },
    {
      amount: 'amount_month5',
      amount_oc: 'amount_month5_oc',
    },
    {
      amount: 'amount_month6',
      amount_oc: 'amount_month6_oc',
    },
    {
      amount: 'amount_month7',
      amount_oc: 'amount_month7_oc',
    },
    {
      amount: 'amount_month8',
      amount_oc: 'amount_month8_oc',
    },
    {
      amount: 'amount_month9',
      amount_oc: 'amount_month9_oc',
    },
    {
      amount: 'amount_month10',
      amount_oc: 'amount_month10_oc',
    },
    {
      amount: 'amount_month11',
      amount_oc: 'amount_month11_oc',
    },
    {
      amount: 'amount_month12',
      amount_oc: 'amount_month12_oc',
    },
  ];
  const accountDebit = computed(() => {
    const accountCombos = proxy.$store.getters[`${ModuleAccountCombo}/items`];

    let value = accountCombos.filter(
      x =>
        x.account_number.startsWith('0') &&
        (!x.is_parent || proxy.$ms.constant.AccountNumber.ListAccountForeignParent.includes(x.account_number)),
    );
    console.log(value);
    return value;
  });

  const {
    cacheAccountDebitCombo,
    cacheAccountCreditCombo,
    cacheAccountDebitParalellCombo,
    cacheAccountCreditParalellCombo,
  } = useCacheAccountComboConfig();
  cacheAccountDebitCombo.modelValueField = 'debit_account';
  cacheAccountDebitCombo.data = accountDebit;
  cacheAccountDebitParalellCombo.modelValueField = 'debit_account';
  cacheAccountCreditParalellCombo.modelValueField = 'credit_account';

  const {cacheBudgetSourceComboConfig} = useCacheBudgetSourceComboConfig();

  const {cacheBudgetChapterComboConfig} = useCacheBudgetChapterComboConfig();

  const {cacheBudgetKindItemComboConfig, cacheBudgetSubKindItemComboConfig} = useCacheBudgetKindItemComboConfig();

  const {cacheBudgetItemComboConfig, cacheBudgetSubItemComboConfig, cacheBudgetDetailItemComboConfig} =
    useCacheBudgetItemComboConfig();

  const {cacheProjectComboConfig} = useCacheProjectComboConfig();
  const {cacheAccountingObjectComboConfig} = useCacheAccountingObjectComboConfig();

  const {cacheActivityComboConfig} = useCacheActivityComboConfig();

  const {cacheStatisticComboConfig} = useCacheStatisticComboConfig();

  const {cacheBankInfoComboConfig} = useCacheBankInfoComboConfig();

  const {cacheBudgetGroupItemComboConfig} = useCacheBudgetGroupItemComboConfig();

  const {cacheContractComboConfig} = useCacheContractComboConfig();
  const {cacheTopicComboConfig} = useCacheTopicComboConfig();
  const {cacheTaskComboConfig} = useCacheTaskComboConfig();
  const {cacheBudgetProvideComboConfig} = useCacheBudgetProvideComboConfig();

  const {cacheFundStructureComboConfig} = useCacheFundStructureComboConfig();

  const {cacheFundComboConfig} = useCacheFundComboConfig();

  const {cacheBudgetFeesComboConfig} = useCacheBudgetFeesComboConfig();

  /**
   * Tạo object lưu dữ liệu các field
   */
  const comboboxDataRemote = reactive({
    budget_source_name: [], // Nguồn
    debit_account: [], // Tài khoản nợ
    budget_kind_item_code: [], //Loại
    budget_sub_kind_item_code: [], //Khoản
    bank_account: [], //Tài khoản NH,KB
    project_code: [], //CTMT,Dự án
    statistic_code: [], // Mã thống kê
    budgetChapter: [], //CB chương
    currency: [], //Cb loại tiền
    budget_group_item_code: [], // Nhóm mục chi
  });

  //#region config ẩn hiện column
  /**
   * config ẩn hiện column grid hạch toán
   * NNLINH 23.05.2022
   */
  const columnsData = computed(() => {
    if (proxy.model.currency_code && proxy.model.currency_code != proxy.$t('i18nEnum.Currency.VND')) {
      let data = _.cloneDeep(columns);
      data.forEach(x => {
        if (x.dataField == 'amount_oc') {
          x.visible = true;
        }
      });
      return data;
    }

    return columns;
  });

  /**
   * config ẩn hiện column grid phân bổ theo quý
   * NNLINH 23.05.2022
   */
  const columnsQuaterData = computed(() => {
    if (proxy.model.currency_code && proxy.model.currency_code != proxy.$t('i18nEnum.Currency.VND')) {
      let data = _.cloneDeep(columnsQuarter);
      data.forEach(x => {
        if (
          x.dataField == 'amount_oc' ||
          x.dataField == 'amount_quater1OC' ||
          x.dataField == 'amount_quater2OC' ||
          x.dataField == 'amount_quater3OC' ||
          x.dataField == 'amount_quater4OC'
        ) {
          x.visible = true;
        }
      });
      return data;
    }

    return columnsQuarter;
  });

  /**
   * config ẩn hiện column grid phân bổ theo tháng
   * NNLINH 23.05.2022
   */
  const columnsMonthData = computed(() => {
    if (proxy.model.currency_code && proxy.model.currency_code != proxy.$t('i18nEnum.Currency.VND')) {
      let data = _.cloneDeep(columnsMonth);
      data.forEach(x => {
        if (
          x.dataField == 'amount_oc' ||
          x.dataField == 'amount_month1_oc' ||
          x.dataField == 'amount_month2_oc' ||
          x.dataField == 'amount_month3_oc' ||
          x.dataField == 'amount_month4_oc' ||
          x.dataField == 'amount_month5_oc' ||
          x.dataField == 'amount_month6_oc' ||
          x.dataField == 'amount_month7_oc' ||
          x.dataField == 'amount_month8_oc' ||
          x.dataField == 'amount_month9_oc' ||
          x.dataField == 'amount_month10_oc' ||
          x.dataField == 'amount_month11_oc' ||
          x.dataField == 'amount_month12_oc'
        ) {
          x.visible = true;
        }
      });
      return data;
    }

    return columnsMonth;
  });
  //#endregion

  /**
   * Biến dùng để disabled tiện ích
   * NNlinh 11.05.2022
   */
  const valueMode = computed(() => {
    return proxy.editMode != proxy.$ms.constant.FormState.View;
  });

  const disabledDelete = computed(() => {
    return proxy.editMode != proxy.$ms.constant.FormState.View || proxy.model.is_posted;
  });

  /**
   *Khai báo items của các button
   */
  const buttonUtilities = reactive([
    {text: 'Thêm mới từ chứng từ', command: proxy.$ms.constant.Command.Add, disabledItem: valueMode},
    {text: 'Thêm mới từ chứng từ hiện thời', command: proxy.$ms.constant.Command.Duplicate, disabledItem: valueMode},
    // { text: 'Xóa chứng từ', command: 'Delete', disabledItem: disabledDelete, seperatorBottom: true },
    {text: 'Xem số dư tài khoản', command: proxy.$ms.constant.Command.ViewAccount},
    {
      text: 'Cất thành định khoản tự động',
      command: 'AddAutoBusiness',
    },
  ]);

  const buttonPrints = reactive([{text: 'Chứng từ kế toán'}, {text: 'Tùy chọn in...'}]);

  /**
   * Khai báo tab active hiển thị ban đầu khi mở popup
   */
  const selectedTab = ref(0);

  /**
   * Chọn tab được active
   * @param value: giá trị tab active
   */
  const selectedTabHandler = value => {
    selectedTab.value = value;
  };

  /**
   * Chọn chương hiển thị tên chương
   *  NNLINH 06/05/2022
   */
  const selectedChapter = ({newData}) => {
    if (newData) {
      proxy.model.budget_chapter_name = newData.budget_chapter_name;

      proxy.model.BUPlanReceiptDetails?.filter(x=>x.state !== proxy.$ms.constant.ModelState.Delete && x.state !== proxy.$ms.constant.ModelState.Empty)
      .forEach(x => {
        x.budget_chapter_code = newData.budget_chapter_code;
      });
      proxy.model.Parallels?.filter(x=>x.state !== proxy.$ms.constant.ModelState.Delete && x.state !== proxy.$ms.constant.ModelState.Empty)
      .forEach(x => {
        x.budget_chapter_code = newData.budget_chapter_code;
      });
    } else {
      proxy.model.budget_chapter_name = '';

      proxy.model.BUPlanReceiptDetails?.forEach(x => {
        x.budget_chapter_code = null;
      });
      proxy.model.Parallels?.forEach(x => {
        x.budget_chapter_code = null;
      });
    }
  };
  /**
   * Chọn loại tiền hiển thị tỷ giá
   * NNLINH 06/05/2022
   */
  const selectedCurrency = ({newData}) => {
    if (newData) {
      proxy.model.exchange_rate = newData.exchange_rate;
    } else {
      proxy.model.exchange_rate = '';
    }
  };

  // Init các field của grid detail
  // Init các field của grid detail
  const initGridColumnParallel = () => {
    return [
      {
        caption: 'Diễn giải',
        dataField: 'description',
        columnType: proxy.$ms.constant.ColumnType.Text,
        width: 250,
        editable: true,
        sortable: true,
      },
      {
        caption: 'TK Nợ',
        title: 'Tài khoản Nợ',
        dataField: 'debit_account',
        width: 100,
        columnType: proxy.$ms.constant.ColumnType.Combobox,
        editable: true,
        sortable: true,
      },
      {
        caption: 'TK Có',
        title: 'Tài khoản Có',
        dataField: 'credit_account',
        width: 100,
        columnType: proxy.$ms.constant.ColumnType.Combobox,
        editable: true,
        sortable: true,
      },
      {
        caption: 'Số tiền',
        dataField: 'amount_oc',
        width: 150,
        editable: true,
        columnType: proxy.$ms.constant.ColumnType.Number,
        formatType: proxy.$ms.constant.FormatType.Amount,
        summaryType: proxy.$ms.constant.SummaryType.Sum,
        sortable: true,
      },
      {
        caption: 'Quy đổi',
        dataField: 'amount',
        width: 150,
        editable: true,
        columnType: proxy.$ms.constant.ColumnType.Number,
        formatType: proxy.$ms.constant.FormatType.Amount,
        summaryType: proxy.$ms.constant.SummaryType.Sum,
        visible: false,
        sortable: true,
        rules: [
          {
            name: 'lessThanAmount',
            compareValue: 100000000000000,
          },
        ],
      },
      {
        caption: 'Nguồn',
        dataField: 'budget_source_name',
        width: 250,
        columnType: proxy.$ms.constant.ColumnType.Combobox,
        editable: true,
        sortable: true,
      },
      {
        caption: 'Mã dự phòng',
        dataField: 'budget_provide_code',
        width: 100,
        columnType: proxy.$ms.constant.ColumnType.Combobox,
        editable: true,
        sortable: true,
      },
      {
        caption: 'Chương',
        dataField: 'budget_chapter_code',
        columnType: proxy.$ms.constant.ColumnType.Combobox,
        width: 100,
        editable: true,
        sortable: true,
        rules: [{name: 'required'}],
      },
      {
        caption: 'Khoản',
        dataField: 'budget_sub_kind_item_code',
        columnType: proxy.$ms.constant.ColumnType.Combobox,
        width: 100,
        editable: true,
        sortable: true,
      },
      {
        caption: 'Mục',
        dataField: 'budget_item_code',
        columnType: proxy.$ms.constant.ColumnType.Combobox,
        width: 100,
        editable: true,
        sortable: true,
      },
      {
        caption: 'Tiểu mục',
        dataField: 'budget_sub_item_code',
        columnType: proxy.$ms.constant.ColumnType.Combobox,
        width: 100,
        editable: true,
        sortable: true,
      },
      {
        caption: 'Tiết tiểu mục',
        dataField: 'budget_detail_item_code',
        columnType: proxy.$ms.constant.ColumnType.Combobox,
        width: 100,
        editable: true,
        sortable: true,
      },
      {
        caption: 'Cấp phát',
        dataField: 'method_distribute_name',
        columnType: proxy.$ms.constant.ColumnType.Enum,
        editable: false,
        formatType: proxy.$ms.constant.FormatType.Enum,
        width: 150,
        sortable: true,
        enum: 'MethodDistributeType',
      },
      {
        caption: 'Nghiệp vụ',
        dataField: 'cash_withdraw_type_name',
        columnType: proxy.$ms.constant.ColumnType.Enum,
        editable: false,
        formatType: proxy.$ms.constant.FormatType.Enum,
        width: 150,
        sortable: true,
        enum: 'CashWithDrawType',
      },
      {
        width: 136,
        caption: 'Mã thống kê',
        dataField: 'statistic_code',
        columnType: proxy.$ms.constant.ColumnType.Combobox,
        editable: true,
        sortable: true,
        visible: true,
      },
      {
        width: 100,
        caption: 'Nhiệm vụ',
        dataField: 'task_code',
        columnType: proxy.$ms.constant.ColumnType.Combobox,
        editable: true,
        sortable: true,
      },
      {
        caption: 'Hoạt động',
        dataField: 'activity_name',
        columnType: proxy.$ms.constant.ColumnType.Combobox,
        editable: true,
        width: 136,
        sortable: true,
      },
      {
        caption: 'CTMT, dự án',
        title: 'Chương trình mục tiêu, dự án',
        dataField: 'project_code',
        columnType: proxy.$ms.constant.ColumnType.Combobox,
        editable: true,
        width: 100,
        sortable: true,
      },
      {
        caption: 'Tài khoản NH, KB',
        title: 'Tài khoản ngân hàng, kho bạc',
        dataField: 'bank_account',
        columnType: proxy.$ms.constant.ColumnType.Combobox,
        editable: true,
        width: 100,
        sortable: true,
      },
      {
        caption: 'Phí, lệ phí',
        title: 'Phí, lệ phí',
        dataField: 'budget_fees_code',
        columnType: proxy.$ms.constant.ColumnType.Combobox,
        editable: true,
        width: 100,
        sortable: true,
      },
      {
        width: 100,
        caption: 'Đề tài',
        editable: true,
        sortable: true,
        dataField: 'topic_code',
        columnType: proxy.$ms.constant.ColumnType.Combobox,
        filterable: true,
      },
      {
        width: 100,
        caption: 'Hợp đồng',
        editable: true,
        sortable: true,
        dataField: 'contract_no',
        columnType: proxy.$ms.constant.ColumnType.Combobox,
      },
      {
        width: 100,
        caption: 'Nguồn năm trước',
        editable: true,
        sortable: true,
        dataField: 'is_source_before_year',
        columnType: proxy.$ms.constant.ColumnType.Checkbox,
      },
      {
        caption: '',
        dataField: 'rowAction',
        width: 80,
        columnType: proxy.$ms.constant.ColumnType.Action,
        sortable: false,
      },
    ];
  };

  // Khởi tạo các field của grid Hạch toán đồng thời
  const columnParallel = reactive(initGridColumnParallel());

  /**
   * Khởi tạo config cho combox trong grid
   */
  const {
    budgetSourceComboConfig, //CB Nguồn
    accountComboConfig, //CB tài khoản nợ
    budgetSubKindItemComboConfig, //CB loại khoản
    budgetKindItemComboConfig, //CB khoản
    budgetItemComboConfig, // CB mục
    bankAccountComboConfig, //CB TK ngân hàng
    projectComboConfig, //CB Dự án
    statisticComboConfig, //CB mã thống kê
    groupItemComboConfig, //CB Nhóm mục chi
    TaskComboConfig,
    onBudgetChapterComboboxLoadData,
    budgetDetailItemComboConfig,
    fundStructureComboConfig,
    topicComboConfig,
    budgetProvideComboConfig,
    projectExpenseComboConfig,
  } = useInitActionCombo(comboboxDataRemote, comboboxLoadData);

  /**
   * Lấy tài khoảng ngoại bảng
   * NNkiem 19.07.2022
   */
  const onAccountComboboxLoadData = (payload, row, column) => {
    let ors = [{Field: 'inactive', Operator: 'NULL'}];
    let orsIsParent = [{Field: 'is_parent', Operator: 'NULL'}];
    let ors2 = [{Field: 'is_parent', Value: false, Ors: orsIsParent}];
    let extend = [
      {Field: 'inactive', Value: false, Ors: ors},
      {
        Field: 'account_number',
        Operator: 'IN',
        Value: proxy.$ms.constant.AccountNumber.ListAccountForeignParent,
        Ors: ors2,
      },
      {Field: 'account_number', Value: '0', Operator: proxy.$ms.constant.FilterOperator.StartsWith},
    ];
    payload.sort = 'account_number';
    payload.filter = extendFilter(payload.filter, extend);

    comboboxLoadData(payload, api, comboboxDataRemote, column.dataField);
  };

  // config columns combo số tài khoản
  const accountComboMostDetailConfig = {
    data: comboboxDataRemote,
    columns: [
      {
        title: 'Số tài khoản',
        dataField: 'account_number',
        width: 120,
        filterOperator: proxy.$ms.constant.FilterOperator.StartsWith,
      },
      {
        title: 'Tên tài khoản',
        dataField: 'account_name',
        filterOperator: proxy.$ms.constant.FilterOperator.Contains,
        width: 480,
      },
    ],
    displayField: 'account_number',
    valueField: 'account_number',
    queryMode: 'remote',
    dropdownWidth: 600,
    comboboxLoadData: onAccountComboboxLoadData,
  };

  /**
   * xử lý khi chọn loại tiền tính tiền quy đổi
   * @param {*} value
   * NNLINH 24.05.2022
   */
  const onActionBlur = value => {
    proxy.model.Parallels.forEach(x => {
      if (x.state != proxy.$ms.constant.ModelState.Empty) {
        x.amount =
          proxy?.$ms?.commonFn?.roundDecimalDbOption(
            proxy?.$ms?.constant?.DbOptionKey?.CurrencyDecimalDigits,
            x.amount_oc * value,
          ) || x.amount_oc * value;
        }
      });

    proxy.model.BUPlanReceiptDetails.forEach(x => {
      if (x.state != proxy.$ms.constant.ModelState.Empty) {
        x.amount =
          proxy?.$ms?.commonFn?.roundDecimalDbOption(
            proxy?.$ms?.constant?.DbOptionKey?.CurrencyDecimalDigits,
            x.amount_oc * value,
          ) || x.amount_oc * value;
        // tính tiền quy đổi từng tháng

        x.amount_month1 =
          proxy?.$ms?.commonFn?.roundDecimalDbOption(
            proxy?.$ms?.constant?.DbOptionKey?.CurrencyDecimalDigits,
            x.amount_month1_oc * value,
          ) ||
          x.amount_month1_oc * value ||
          0;

        x.amount_month2 =
          proxy?.$ms?.commonFn?.roundDecimalDbOption(
            proxy?.$ms?.constant?.DbOptionKey?.CurrencyDecimalDigits,
            x.amount_month2_oc * value,
          ) ||
          x.amount_month2_oc * value ||
          0;

        x.amount_month3 =
          proxy?.$ms?.commonFn?.roundDecimalDbOption(
            proxy?.$ms?.constant?.DbOptionKey?.CurrencyDecimalDigits,
            x.amount_month3_oc * value,
          ) ||
          x.amount_month3_oc * value ||
          0;

        x.amount_month4 =
          proxy?.$ms?.commonFn?.roundDecimalDbOption(
            proxy?.$ms?.constant?.DbOptionKey?.CurrencyDecimalDigits,
            x.amount_month4_oc * value,
          ) ||
          x.amount_month4_oc * value ||
          0;

        x.amount_month5 =
          proxy?.$ms?.commonFn?.roundDecimalDbOption(
            proxy?.$ms?.constant?.DbOptionKey?.CurrencyDecimalDigits,
            x.amount_month5_oc * value,
          ) ||
          x.amount_month5_oc * value ||
          0;

        x.amount_month6 =
          proxy?.$ms?.commonFn?.roundDecimalDbOption(
            proxy?.$ms?.constant?.DbOptionKey?.CurrencyDecimalDigits,
            x.amount_month6_oc * value,
          ) ||
          x.amount_month6_oc * value ||
          0;

        x.amount_month7 =
          proxy?.$ms?.commonFn?.roundDecimalDbOption(
            proxy?.$ms?.constant?.DbOptionKey?.CurrencyDecimalDigits,
            x.amount_month7_oc * value,
          ) ||
          x.amount_month7_oc * value ||
          0;

        x.amount_month8 =
          proxy?.$ms?.commonFn?.roundDecimalDbOption(
            proxy?.$ms?.constant?.DbOptionKey?.CurrencyDecimalDigits,
            x.amount_month8_oc * value,
          ) ||
          x.amount_month8_oc * value ||
          0;

        x.amount_month9 =
          proxy?.$ms?.commonFn?.roundDecimalDbOption(
            proxy?.$ms?.constant?.DbOptionKey?.CurrencyDecimalDigits,
            x.amount_month9_oc * value,
          ) ||
          x.amount_month9_oc * value ||
          0;

        x.amount_month10 =
          proxy?.$ms?.commonFn?.roundDecimalDbOption(
            proxy?.$ms?.constant?.DbOptionKey?.CurrencyDecimalDigits,
            x.amount_month10_oc * value,
          ) ||
          x.amount_month10_oc * value ||
          0;

        x.amount_month11 =
          proxy?.$ms?.commonFn?.roundDecimalDbOption(
            proxy?.$ms?.constant?.DbOptionKey?.CurrencyDecimalDigits,
            x.amount_month11_oc * value,
          ) ||
          x.amount_month11_oc * value ||
          0;

        x.amount_month12 =
          proxy?.$ms?.commonFn?.roundDecimalDbOption(
            proxy?.$ms?.constant?.DbOptionKey?.CurrencyDecimalDigits,
            x.amount_month12_oc * value,
          ) ||
          x.amount_month12_oc * value ||
          0;
        // tính tiền quy đổi từng quý
        x.amount_quater1 =
          proxy?.$ms?.commonFn?.roundDecimalDbOption(
            proxy?.$ms?.constant?.DbOptionKey?.CurrencyDecimalDigits,
            x.amount_quater1_oc * value,
          ) ||
          x.amount_quater1_oc * value ||
          0;

        x.amount_quater2 =
          proxy?.$ms?.commonFn?.roundDecimalDbOption(
            proxy?.$ms?.constant?.DbOptionKey?.CurrencyDecimalDigits,
            x.amount_quater2_oc * value,
          ) ||
          x.amount_quater2_oc * value ||
          0;

        x.amount_quater3 =
          proxy?.$ms?.commonFn?.roundDecimalDbOption(
            proxy?.$ms?.constant?.DbOptionKey?.CurrencyDecimalDigits,
            x.amount_quater3_oc * value,
          ) ||
          x.amount_quater3_oc * value ||
          0;

        x.amount_quater4 =
          proxy?.$ms?.commonFn?.roundDecimalDbOption(
            proxy?.$ms?.constant?.DbOptionKey?.CurrencyDecimalDigits,
            x.amount_quater4_oc * value,
          ) ||
          x.amount_quater4_oc * value ||
          0;
      }
      if (x.state == proxy.$ms.constant.ModelState.None) {
        x.state = proxy.$ms.constant.ModelState.Update;
      }
    });

    // tính lại tiền dòng tổng
    let totalAmount = proxy.model.BUPlanReceiptDetails.reduce((pre, cur) => {
      cur['amount'] = cur['amount'] ?? 0;
      pre = pre ?? 0;
      return pre + cur['amount'];
    }, 0);

    proxy.model.total_amount = totalAmount;
  };

  const currencyCode = ref('');
  const isFirst = ref(true);
  /**
   * Chọn combo loại tiền nếu có giá trị quy đổi cập nhập lại các cột quy đổi
   * @param {*} param0
   * NNLINH 24.05.2022
   */
  const selectCurrency = ({newData}) => {
    if (newData) {
      currencyCode.value = newData.currency_code;
      proxy.model.exchange_rate = newData.exchange_rate;
      onActionBlur(proxy.model.exchange_rate);
    } else {
      currencyCode.value = '';
      proxy.model.exchange_rate = 0;
      onActionBlur(proxy.model.exchange_rate);
    }
  };

  /**
   * Loại tiền thay đổi thì load lại layout grid
   */
  watch(currencyCode, (newVal, oldVal) => {
    if (!isFirst.value) {
      if (newVal !== oldVal) {
        if (proxy.layoutTagDetail) {
          proxy.initLayoutDetail();
        }
      }
    }
  });

  return {
    toggleAbove,
    toggleAboveHandler,
    buttonUtilities,
    buttonPrints,
    selectedTab,
    selectedTabHandler,
    comboboxDataRemote,
    selectedChapter,
    selectedCurrency,
    onBudgetChapterComboboxLoadData,
    columnsData,
    columnsQuaterData,
    columnsMonthData,
    onActionBlur,
    selectCurrency,
    currencyCode,
    isFirst,
    amountOcColumnMapper,
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
    cacheAccountDebitParalellCombo,
    cacheAccountCreditParalellCombo,
    cacheBudgetSubItemComboConfig,
    cacheBudgetChapterComboConfig,
    cacheContractComboConfig,
    cacheBudgetFeesComboConfig,
    cacheActivityComboConfig,
    cacheFundComboConfig,
    budgetDetailItemComboConfig,
    projectExpenseComboConfig,
    columnParallel,
  };
};

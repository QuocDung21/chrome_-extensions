import { useEffect } from 'react';

import { createLazyFileRoute } from '@tanstack/react-router';

import { SimpleHtmlRenderer } from '../../components';

export const Route = createLazyFileRoute('/forms/')({
    component: RouteComponent
});

function RouteComponent() {
    const myHtml = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
    <meta charset="UTF-8">
    <title> </title>    
    <style>
        body { font-family: 'Times New Roman', Times, serif; margin: 40px; }
        h1, h2, h3 { text-align: center; }
        .header, .footer { text-align: center; }
        .section-title { font-weight: bold; margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px;}
        th, td { border: 1px solid #444; padding: 6px; }
        .no-border { border: none !important; }
        .note { font-size: 0.95em; color: #444; }
        input[type="text"], input[type="date"], input[type="tel"] {
            width: 250px; padding: 2px 6px; font-size: 1em; border: 1px solid #aaa; border-radius: 4px;
        }
        input[type="number"] { width: 80px; }
        select { padding: 2px 6px; font-size: 1em; }
        textarea { width: 98%; min-height: 36px; }
        .short { width: 80px; }
        .center { text-align: center; }
        .checkbox { width: 22px; height: 22px; }
        /* CSS cho in */
        @media print {
            @page {
                margin: 0.5in;
                size: A4;
            }

            /* Ẩn hoàn toàn tất cả */
            * {
                visibility: hidden !important;
            }

            /* Chỉ hiển thị form và các elements con */
            .print-container,
            .print-container * {
                visibility: visible !important;
            }

            /* Đặt form làm root element khi in */
            .print-container {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: auto !important;
                background: white !important;
                z-index: 9999 !important;
            }

            /* Style cho form elements */
            input, select, textarea {
                border: none !important;
                background: none !important;
                box-shadow: none !important;
                font-family: 'Times New Roman', Times, serif !important;
                color: #000 !important;
            }
            input[type="checkbox"] {
                width: 16px !important;
                height: 16px !important;
            }
        }
    </style>
    </head>
    <body>
    <!-- Nút in -->
    <div class="print-btn" style="text-align:right; margin-bottom:20px;">
        <button type="button" id="print-button" style="padding:7px 20px;font-size:16px;background:#1976d2;color:white;border:none;border-radius:4px;cursor:pointer;">🖨️ In đơn</button>
    </div>

    <div class="print-container">
    <form>
    <div class="header">
        <div>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
        <div><b>Độc lập – Tự do – Hạnh phúc</b></div>
        <br>
        <h2>ĐƠN ĐỀ NGHỊ XÁC ĐỊNH, XÁC ĐỊNH LẠI MỨC ĐỘ KHUYẾT TẬT<br>
        VÀ CẤP, CẤP ĐỔI, CẤP LẠI GIẤY XÁC NHẬN KHUYẾT TẬT</h2>
    </div>

    <div>
        <b>Kính gửi:</b> Chủ tịch UBND xã (phường, thị trấn) <input type="text" name="ubnd_xa"><br>
        Huyện (quận, thị xã, thành phố) <input type="text" name="huyen"><br>
        Tỉnh, thành phố <input type="text" name="tinh">
    </div>

    <p style="margin-top: 24px;">
        Sau khi tìm hiểu quy định về xác định mức độ khuyết tật, tôi đề nghị:<br>
        <input type="checkbox" name="de_nghi1" class="checkbox"> Xác định mức độ khuyết tật và cấp Giấy xác nhận khuyết tật<br>
        <input type="checkbox" name="de_nghi2" class="checkbox"> Xác định lại mức độ khuyết tật và cấp Giấy xác nhận khuyết tật<br>
        <input type="checkbox" name="de_nghi3" class="checkbox"> Cấp lại Giấy xác nhận khuyết tật<br>
        <input type="checkbox" name="de_nghi4" class="checkbox"> Cấp đổi Giấy xác nhận khuyết tật<br>
        <span class="note">(Trường hợp cấp đổi Giấy xác nhận khuyết tật thì không phải kê khai thông tin tại Mục III dưới đây).</span>
    </p>

    <div class="section-title">I. Thông tin người được xác định mức độ khuyết tật</div>
    <ul>
        <li>Họ và tên: <input type="text" name="ho_ten"></li>
        <li>Sinh ngày <input type="number" name="ngay" class="short"> tháng <input type="number" name="thang" class="short"> năm <input type="number" name="nam" class="short">
            Giới tính: <select name="gioi_tinh"><option>Nam</option><option>Nữ</option></select></li>
        <li>Số CMND hoặc CCCD: <input type="text" name="cccd"></li>
        <li>Nơi ở hiện nay: <input type="text" name="dia_chi" style="width:350px"></li>
    </ul>

    <div class="section-title">II. Thông tin người đại diện hợp pháp (nếu có)</div>
    <ul>
        <li>Họ và tên: <input type="text" name="ho_ten_dd"></li>
        <li>Mối quan hệ với người được xác định khuyết tật: <input type="text" name="moi_quan_he"></li>
        <li>Số CMND hoặc CCCD: <input type="text" name="cccd_dd"></li>
        <li>Nơi ở hiện nay: <input type="text" name="dia_chi_dd" style="width:350px"></li>
        <li>Số điện thoại: <input type="tel" name="sdt"></li>
    </ul>

    <div class="section-title">III. Thông tin về tình trạng khuyết tật</div>
    <b>1. Thông tin về dạng khuyết tật (Đánh dấu x vào ô tương ứng):</b>
    <table>
        <tr>
            <th>STT</th>
            <th>Các dạng khuyết tật</th>
            <th class="center">Có</th>
            <th class="center">Không</th>
        </tr>
        <tr>
            <td>1</td>
            <td>Khuyết tật vận động</td>
            <td class="center"><input type="checkbox" name="vt_1_co"></td>
            <td class="center"><input type="checkbox" name="vt_1_khong"></td>
        </tr>
        <tr>
            <td>1.1</td>
            <td>Mềm nhẽo hoặc co cứng toàn thân</td>
            <td class="center"><input type="checkbox" name="vt_11_co"></td>
            <td class="center"><input type="checkbox" name="vt_11_khong"></td>
        </tr>
        <tr>
            <td>1.2</td>
            <td>Thiếu tay hoặc không cử động được tay</td>
            <td class="center"><input type="checkbox" name="vt_12_co"></td>
            <td class="center"><input type="checkbox" name="vt_12_khong"></td>
        </tr>
        <!-- ...Các dòng còn lại giữ nguyên như phần đã cung cấp ở trên... -->
    </table>

    <b>2. Thông tin về mức độ khuyết tật (Trường hợp trẻ em dưới 6 tuổi không phải kê khai)</b>
    <table>
        <tr>
            <th rowspan="2">Các hoạt động</th>
            <th colspan="4">Mức độ thực hiện</th>
        </tr>
        <tr>
            <th>Thực hiện được</th>
            <th>Thực hiện được nhưng cần trợ giúp</th>
            <th>Không thực hiện được</th>
            <th>Không xác định được</th>
        </tr>
        <tr>
            <td>1. Đi lại</td>
            <td class="center"><input type="checkbox" name="hd_1_a"></td>
            <td class="center"><input type="checkbox" name="hd_1_b"></td>
            <td class="center"><input type="checkbox" name="hd_1_c"></td>
            <td class="center"><input type="checkbox" name="hd_1_d"></td>
        </tr>
        <!-- ...Các dòng còn lại giữ nguyên như phần đã cung cấp ở trên... -->
    </table>

    <div class="footer">
        <br><br>
        ………….., ngày <input type="number" name="ngay_nop" class="short"> tháng <input type="number" name="thang_nop" class="short"> năm <input type="number" name="nam_nop" class="short"><br>
        Người viết đơn<br>
        (Ký và ghi rõ họ tên) <input type="text" name="nguoi_viet">
    </div>
    </form>
    </div>



    </body>
    </html>

    `;

    // Bind events sau khi component render
    useEffect(() => {
        const printButton = document.getElementById('print-button');

        const handlePrint = () => {
            console.log('Print button clicked!');

            // Sync form values to attributes trước khi in
            const inputs = document.querySelectorAll('input, select, textarea');
            inputs.forEach((input: any) => {
                if (input.type === 'checkbox') {
                    if (input.checked) {
                        input.setAttribute('checked', 'checked');
                    } else {
                        input.removeAttribute('checked');
                    }
                } else if (input.tagName === 'SELECT') {
                    Array.from(input.options).forEach((option: any) => {
                        if (option.selected) {
                            option.setAttribute('selected', 'selected');
                        } else {
                            option.removeAttribute('selected');
                        }
                    });
                } else {
                    input.setAttribute('value', input.value);
                }
            });

            console.log('Printing form...');
            window.print();
        };

        if (printButton) {
            printButton.addEventListener('click', handlePrint);
            console.log('Print button event bound successfully!');
        } else {
            console.log('Print button not found!');
        }

        // Cleanup
        return () => {
            if (printButton) {
                printButton.removeEventListener('click', handlePrint);
            }
        };
    }, []);

    return <SimpleHtmlRenderer htmlContent={myHtml} />;
}

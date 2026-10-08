import {expect} from '@playwright/test';
import assert from 'node:assert/strict';

export async function mobileManagement(page,admin,nav,inspect){
 await nav('Bảng giá & màu');
 await page.getByRole('button',{name:'Danh mục màu',exact:true}).tap();
 await page.getByRole('button',{name:'Thêm mẫu màu',exact:true}).tap();
 await page.getByLabel('Mã / Tên mẫu',{exact:true}).fill('Mobile QA Mix');
 await page.getByLabel('Loại màu',{exact:true}).selectOption('Piano');
 await page.locator('.color-components input').nth(0).check();
 await page.locator('.color-components input').nth(1).check();
 await inspect('manager-color-mix-form');
 await page.getByRole('button',{name:'Lưu mẫu màu',exact:true}).tap();
 await expect(page.locator('.color-form')).toHaveCount(0);
 const color=(await admin.call('/pricing')).colors.find(c=>c.code==='Mobile QA Mix');assert.equal(color.components.length,2);
 await page.getByRole('button',{name:'Điều chỉnh & lịch sử',exact:true}).tap();
 await page.getByLabel('Phạm vi',{exact:true}).selectOption('all');
 await page.getByLabel('Tỷ lệ điều chỉnh (%)',{exact:true}).fill('1');
 await page.getByRole('button',{name:'Xem trước thay đổi',exact:true}).tap();
 await expect(page.locator('.price-preview')).toBeVisible();await inspect('manager-pricing-preview');
 const before=(await admin.call('/pricing')).prices[0].price;
 await page.getByRole('button',{name:'Xác nhận áp dụng 1%',exact:true}).tap();
 await expect(page.getByRole('button',{name:'Khôi phục lần này',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Khôi phục lần này',exact:true}).tap();await inspect('manager-pricing-restore');
 await page.getByRole('button',{name:'Xác nhận khôi phục',exact:true}).tap();
 await expect(page.getByText('Đã khôi phục giá và lưu lịch sử.',{exact:true})).toBeVisible();
 assert.equal((await admin.call('/pricing')).prices[0].price,before);
 console.log('PASS mobile manager: touch color composition, price preview, adjustment and restore');
}

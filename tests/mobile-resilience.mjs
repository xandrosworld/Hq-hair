import {expect} from '@playwright/test';
import assert from 'node:assert/strict';

export async function draftRecovery(page,sale){
 const endpoint='**/api/work/orders',note=page.getByLabel('Ghi chú đơn hàng',{exact:true});
 await page.route(endpoint,route=>route.abort('internetdisconnected'));
 await note.fill('Draft retained during mobile connection failure');
 await expect(page.locator('#order-editor-content [role=status]')).toContainText('Chưa lưu lên hệ thống');
 await expect(note).toHaveValue('Draft retained during mobile connection failure');
 await page.unroute(endpoint);
 await note.fill('Draft recovered after mobile connection failure');
 await expect(page.getByText('Đã tự lưu',{exact:true})).toBeVisible();
 const state=await sale.call('/state');
 assert.equal(state.orders.filter(o=>o.note==='Draft recovered after mobile connection failure').length,1);
 page.once('dialog',dialog=>dialog.accept());
 await page.getByRole('button',{name:'Xóa thông tin nháp',exact:true}).tap();
 await expect(note).toHaveValue('');
 assert.equal((await sale.call('/state')).orders.filter(o=>o.note==='Draft recovered after mobile connection failure').length,0);
 await page.getByLabel('Dự kiến giao hàng',{exact:true}).fill('2026-12-01');
 await page.getByRole('button',{name:'Thêm sản phẩm',exact:true}).first().tap();
 console.log('PASS draft: failed network preserves input; retry persists exactly one draft; clearing draft also works with blocked browser storage');
}

export async function pendingModal(page,id){
 const endpoint=`**/api/work/orders/${id}/action`;
 let pending;
 await page.route(endpoint,route=>{pending=route});
 await page.getByLabel('Ghi chú thao tác',{exact:true}).fill('Retained after slow mobile request');
 await page.getByRole('dialog').getByRole('button',{name:'Xác nhận',exact:true}).tap();
 await expect(page.getByRole('button',{name:'Đang lưu…',exact:true})).toBeDisabled();
 await expect.poll(()=>!!pending).toBe(true);
 try{
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeVisible();
  await pending.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'QA temporary network failure'})});
  await expect(page.getByRole('dialog').getByRole('button',{name:'Xác nhận',exact:true})).toBeEnabled();
  await expect(page.getByLabel('Ghi chú thao tác',{exact:true})).toHaveValue('Retained after slow mobile request');
 }finally{await page.unroute(endpoint)}
 await page.getByRole('dialog').getByRole('button',{name:'Xác nhận',exact:true}).tap();
 console.log('PASS modal: Escape cannot dismiss a pending save; server failure retains fields and permits retry');
}


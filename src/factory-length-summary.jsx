import React from 'react';
export function FactoryLengthSummary({rows}){
 const grams=[0,1,2,3].map(i=>rows.reduce((s,r)=>s+(r.lengthGrams?.[i]||0),0)),total=grams.reduce((s,n)=>s+n,0);
 const number=n=>n.toLocaleString('vi-VN',{maximumFractionDigits:3});
 return <section className="panel panel-body factory-length-summary" aria-label="Thống kê theo độ dài"><h3>Thống kê theo độ dài</h3><p className="muted">Theo ngày duyệt đơn trong kỳ đã chọn. Tỷ lệ tính trên tổng kg; không quy đổi sản phẩm tính bằng cái hoặc bó.</p><div className="table-scroll"><table><thead><tr><th>Độ dài</th><th>Khối lượng (kg)</th><th>Tỷ lệ</th></tr></thead><tbody>{['40–50 cm','55–65 cm','Từ 70 cm trở lên','Khác'].map((label,i)=><tr key={label}><td>{label}</td><td>{number(grams[i]/1000)}</td><td>{(total?grams[i]/total*100:0).toLocaleString('vi-VN',{maximumFractionDigits:2})}%</td></tr>)}</tbody><tfoot><tr><th>Tổng</th><th>{number(total/1000)}</th><th>{total?'100%':'0%'}</th></tr></tfoot></table></div><small>“Khác” gồm độ dài ngoài ba nhóm hoặc chưa nhập độ dài. Tỷ lệ được làm tròn đến hai chữ số thập phân.</small></section>;
}

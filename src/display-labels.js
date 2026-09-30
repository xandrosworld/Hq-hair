// Translate controlled display values without rewriting stored customer data.
const labels = {'Start Business':'Mới kinh doanh',Salon:'Tiệm tóc',Wholesale:'Khách sỉ','United States':'Hoa Kỳ','United Kingdom':'Vương quốc Anh',France:'Pháp',Germany:'Đức',Australia:'Úc',Canada:'Canada',Nigeria:'Nigeria','South Africa':'Nam Phi',Vietnam:'Việt Nam','Sale tiếp nhận':'Kinh doanh tiếp nhận','Kiểm định & đặt ship':'Kiểm định & đặt vận chuyển'};
export const displayLabel = value => labels[value] || value;

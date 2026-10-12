export async function fetchStandardsPdf(onProgress,signal){
 const response=await fetch('/api/work/product-standards/original.pdf?download=1',{signal,cache:'no-store'});
 if(!response.ok)throw new Error('Không tải được PDF. Vui lòng kiểm tra kết nối hoặc đăng nhập lại.');
 if(!response.headers.get('content-type')?.includes('application/pdf'))throw new Error('Máy chủ không trả về tài liệu PDF. Vui lòng đăng nhập lại.');
 const total=Number(response.headers.get('content-length'))||0,reader=response.body.getReader(),chunks=[];let received=0;
 while(true){const {done,value}=await reader.read();if(done)break;chunks.push(value);received+=value.length;onProgress({received,total})}
 if(total&&received!==total)throw new Error('PDF chưa tải đủ. Vui lòng thử lại.');
 const blob=new Blob(chunks,{type:'application/pdf'});
 if(await blob.slice(0,5).text()!=='%PDF-'||!(await blob.slice(-1024).text()).includes('%%EOF'))throw new Error('PDF tải về chưa hoàn chỉnh. Vui lòng thử lại.');
 return blob;
}

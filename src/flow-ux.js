export * from '/flow/flow-ux/src/flow-format.js';
export * from '/flow/flow-ux/src/base-element.js';
export * from '/flow/flow-ux/src/flow-swipeable.js';
import {i18n, T, i18nFormat, i18nHTMLFormat, FlowI18nDialog} from '/flow/flow-ux/src/flow-i18n.js';
import {paginationStyle as pCss, css} from '/flow/flow-ux/src/base-element.js';

const throttle = (func, time) => {
	let timeoutId;
	let runTs;
	return (...args)=>{
	  if (!runTs) {
		func(...args)
		runTs = Date.now();
	  } else {
		timeoutId && clearTimeout(timeoutId);
		timeoutId = setTimeout(()=>{
			if ((Date.now() - runTs) >= time) {
				func(...args);
				runTs = Date.now();
			}
		 }, time - (Date.now() - runTs));
	  }
	}
  }

export {i18n, T, throttle, i18nFormat, i18nHTMLFormat, FlowI18nDialog};
export const paginationStyle = [pCss, css`
	.pagination a{
		padding:var(--flow-btn-padding);
	}
`]

export const txListStyle = css`
	.tx-list .tx-row{
		margin:0px 5px;
		display:flex;background-color:var(--tx-bg-color-1);
		border-bottom:1px solid var(--tx-border-color);
		flex-wrap:wrap;padding:2px;
		position:relative;
	}
	.tx-list .tx-icon{--fa-icon-color:var(--flow-primary-color)}
	.tx-list .tx-row .tx-progressbar{position:absolute;left:5px; top:30px;}
	.tx-list .tx-row:nth-child(2n){background-color:var(--tx-bg-color-2)}
	.tx-list .tx-date{white-space:nowrap;margin-left:16px;}
	.tx-list .tx-id,
	.tx-list .tx-address{
		flex:1;overflow:hidden;text-overflow:ellipsis;box-sizing:border-box;
	}
	.tx-list .tx-note{box-sizing:border-box;}
	.tx-list .tx-row>div{padding:2px;}
	.tx-list .tx-row>.tx-id,
	.tx-list .tx-row>.tx-address,
	.tx-list .tx-row>.tx-note{padding-left:37px;}
	
	.tx-list .tx-amount{
		white-space:nowrap;margin:0px 20px;
		flex:1;text-align:right;color:#029a45;
	}
	.tx-list .tx-num{min-width:60px}
	.tx-list .br{min-width:100%;}
	.tx-list [txout] .tx-amount{color:#a00}
	[txmoved], .tx-list [txmoved].tx-row{
		display:none;
		text-decoration:line-through;background-color:rgba(255, 0, 0, 0.16);
	}
`

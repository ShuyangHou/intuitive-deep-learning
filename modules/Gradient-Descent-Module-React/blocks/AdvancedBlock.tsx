import { Callout } from '../../shared/react/feedback/Callout';
import { ContentBlock } from '../../shared/react/layout/ContentBlock';
import { AdvancedSection } from './rigor';

export function AdvancedBlock() {
  return (
    <ContentBlock
      className="gd-react-block"
      title="延伸拓展"
      subtitle="以下内容供课后延伸阅读或教师课堂展开，不纳入必须掌握的范围。点击各标题展开对应主题。"
    >
      <Callout
        tone="blue"
        label="可选内容"
        text="本节不设置必答题。你可以直接滚动到底部进入下一课，或点击下方任意主题展开阅读。"
      />

      <AdvancedSection />
    </ContentBlock>
  );
}

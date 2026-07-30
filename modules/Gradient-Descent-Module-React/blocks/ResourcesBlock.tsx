import { LessonFooter } from '../../shared/react/learning/LessonFooter';

const videos = [
  {
    title: '【梯度下降】3D可视化讲解通俗易懂',
    embed: '<iframe src="//player.bilibili.com/player.html?isOutside=true&aid=891549064&bvid=BV18P4y1j7uH&cid=437149663&p=1" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true" title="梯度下降 3D 可视化讲解"></iframe>',
  },
  {
    title: '不至于吧，梯度下降简单得有点离谱了啊！',
    embed: '<iframe src="//player.bilibili.com/player.html?isOutside=true&aid=1205349176&bvid=BV19f421Q7CL&cid=1569512599&p=1" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true" title="梯度下降直观讲解"></iframe>',
  },
  {
    title: '梯度下降法：还在盲人下山？一集视频讲透底层逻辑！',
    embed: '<iframe src="//player.bilibili.com/player.html?isOutside=true&aid=115694389697492&bvid=BV14kmxBiEja&cid=34635778203&p=1" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true" title="梯度下降法底层逻辑"></iframe>',
  },
  {
    title: '如何理解“梯度下降法”？什么是“反向传播”？通过一个视频，一步一步全部搞明白',
    embed: '<iframe src="//player.bilibili.com/player.html?isOutside=true&aid=504221815&bvid=BV1Zg411T71b&cid=371000112&p=1" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true" title="梯度下降与反向传播"></iframe>',
  },
];

export function ResourcesBlock() {
  return (
    <LessonFooter
      className="gd-react-block"
      title="继续你的学习旅程"
      description="你可以返回课程目录，或在准备好后继续前往下一步。"
      back={{ href: '/', label: '返回课程目录' }}
      next={{ href: '/modules/activation-func-module-react', label: '学习下一课' }}
      videos={videos}
      videosLabel="延伸观看"
    />
  );
}

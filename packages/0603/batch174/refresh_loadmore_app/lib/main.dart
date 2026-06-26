import 'package:flutter/material.dart';

import 'article_repository.dart';

void main() {
  runApp(const RefreshLoadMoreApp());
}

class RefreshLoadMoreApp extends StatelessWidget {
  const RefreshLoadMoreApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Refresh & Load More',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.teal),
        useMaterial3: true,
      ),
      home: ArticleListPage(repository: ArticleRepository()),
    );
  }
}

class ArticleListPage extends StatefulWidget {
  final ArticleRepository repository;

  const ArticleListPage({super.key, required this.repository});

  @override
  State<ArticleListPage> createState() => _ArticleListPageState();
}

class _ArticleListPageState extends State<ArticleListPage> {
  static const int _pageSize = 20;
  static const int _maxItems = 100;

  final List<Article> _articles = [];
  int _currentPage = 0;
  bool _isLoading = false;
  bool _hasMore = true;
  bool _isLoadingMore = false;
  bool _hasError = false;
  bool _loadMoreError = false;
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _loadInitialData();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
            _scrollController.position.maxScrollExtent - 100 &&
        !_isLoadingMore &&
        !_loadMoreError &&
        _hasMore) {
      _loadMore();
    }
  }

  Future<void> _loadInitialData() async {
    _isLoadingMore = true;
    try {
      setState(() {
        _isLoading = true;
        _hasError = false;
      });
      final data = await widget.repository.fetchArticles(0, _pageSize);
      setState(() {
        _articles.clear();
        _articles.addAll(data);
        _currentPage = 1;
        _hasMore = _articles.length < _maxItems;
        _isLoading = false;
        _isLoadingMore = false;
        _hasError = false;
      });
    } catch (_) {
      setState(() {
        _isLoading = false;
        _hasError = true;
        _isLoadingMore = false;
      });
    }
  }

  Future<void> _onRefresh() async {
    _isLoadingMore = true;
    try {
      setState(() {
        _hasError = false;
        _loadMoreError = false;
      });
      final data = await widget.repository.fetchArticles(0, _pageSize);
      setState(() {
        _articles.clear();
        _articles.addAll(data);
        _currentPage = 1;
        _hasMore = _articles.length < _maxItems;
        _isLoading = false;
        _isLoadingMore = false;
        _hasError = false;
        _loadMoreError = false;
      });
    } catch (_) {
      setState(() {
        _hasError = _articles.isEmpty;
        _isLoadingMore = false;
      });
    }
  }

  Future<void> _loadMore() async {
    if (_isLoadingMore || !_hasMore || _loadMoreError) return;
    _isLoadingMore = true;
    try {
      setState(() {
        _isLoading = true;
        _loadMoreError = false;
      });
      final startIndex = _currentPage * _pageSize;
      final remaining = _maxItems - _articles.length;
      final count = remaining < _pageSize ? remaining : _pageSize;
      final data = await widget.repository.fetchArticles(startIndex, count);
      setState(() {
        _articles.addAll(data);
        _currentPage++;
        _hasMore = _articles.length < _maxItems;
        _isLoading = false;
        _isLoadingMore = false;
        _loadMoreError = false;
      });
    } catch (_) {
      setState(() {
        _isLoading = false;
        _loadMoreError = true;
        _isLoadingMore = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Articles'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      ),
      body: RefreshIndicator(
        onRefresh: _onRefresh,
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading && _articles.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_hasError && _articles.isEmpty) {
      return _EmptyStateWidget(
        imageUrl:
            'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=empty%20box%20illustration%20simple%20flat%20design&image_size=square',
        title: '加载失败',
        subtitle: '请检查网络连接后重试',
        buttonText: '点击重试',
        onRetry: _loadInitialData,
        canRefresh: true,
      );
    }
    if (_articles.isEmpty) {
      return _EmptyStateWidget(
        imageUrl:
            'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=no%20data%20available%20illustration%20simple%20flat%20design&image_size=square',
        title: '暂无数据',
        subtitle: '这里还没有内容',
        buttonText: '点击刷新',
        onRetry: _loadInitialData,
        canRefresh: true,
      );
    }
    return ListView.builder(
      controller: _scrollController,
      physics: const AlwaysScrollableScrollPhysics(),
      itemCount: _articles.length + (_hasMore || _loadMoreError ? 1 : 0),
      itemBuilder: (context, index) {
        if (index >= _articles.length) {
          if (_loadMoreError) {
            return _RetryFooter(
              onRetry: _loadMore,
            );
          }
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Center(
              child: SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
          );
        }
        final article = _articles[index];
        return _ArticleCard(article: article);
      },
    );
  }
}

class _EmptyStateWidget extends StatelessWidget {
  final String imageUrl;
  final String title;
  final String subtitle;
  final String buttonText;
  final VoidCallback onRetry;
  final bool canRefresh;

  const _EmptyStateWidget({
    required this.imageUrl,
    required this.title,
    required this.subtitle,
    required this.buttonText,
    required this.onRetry,
    this.canRefresh = false,
  });

  @override
  Widget build(BuildContext context) {
    final content = Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Image.network(
              imageUrl,
              width: 120,
              height: 120,
              errorBuilder: (context, error, stackTrace) => Icon(
                Icons.inbox_outlined,
                size: 80,
                color: Colors.grey[300],
              ),
            ),
            const SizedBox(height: 20),
            Text(
              title,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.grey[600],
                  ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh, size: 18),
              label: Text(buttonText),
              style: ElevatedButton.styleFrom(
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              ),
            ),
          ],
        ),
      ),
    );

    if (canRefresh) {
      return LayoutBuilder(
        builder: (context, constraints) => ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            SizedBox(height: constraints.maxHeight, child: content),
          ],
        ),
      );
    }
    return content;
  }
}

class _RetryFooter extends StatelessWidget {
  final VoidCallback onRetry;

  const _RetryFooter({required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Center(
        child: TextButton.icon(
          onPressed: onRetry,
          icon: const Icon(Icons.refresh, size: 18),
          label: const Text('加载失败，点击重试'),
          style: TextButton.styleFrom(
            foregroundColor: Theme.of(context).colorScheme.primary,
          ),
        ),
      ),
    );
  }
}

class _ArticleCard extends StatelessWidget {
  final Article article;

  const _ArticleCard({required this.article});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 16,
                  backgroundColor:
                      Theme.of(context).colorScheme.primaryContainer,
                  child: Text(
                    '${article.id}',
                    style: TextStyle(
                      fontSize: 12,
                      color: Theme.of(context).colorScheme.onPrimaryContainer,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    article.title,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              article.summary,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.grey[600],
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

-- Seed 9 rows into repositories
BEGIN TRANSACTION;

INSERT INTO repositories (user_id, github_url, owner, name, branch, sync_status)
VALUES
  (1, 'https://github.com/example/org1-repo1.git', 'example', 'org1-repo1', 'main', 'pending'),
  (1, 'https://github.com/example/org1-repo2.git', 'example', 'org1-repo2', 'main', 'pending'),
  (2, 'https://github.com/example/org2-repo1.git', 'example', 'org2-repo1', 'main', 'pending'),
  (2, 'https://github.com/example/org2-repo2.git', 'example', 'org2-repo2', 'main', 'pending'),
  (3, 'https://github.com/example/org3-repo1.git', 'example', 'org3-repo1', 'main', 'pending'),
  (3, 'https://github.com/example/org3-repo2.git', 'example', 'org3-repo2', 'main', 'pending'),
  (4, 'https://github.com/example/org4-repo1.git', 'example', 'org4-repo1', 'main', 'pending'),
  (4, 'https://github.com/example/org4-repo2.git', 'example', 'org4-repo2', 'main', 'pending'),
  (5, 'https://github.com/example/org5-repo1.git', 'example', 'org5-repo1', 'main', 'pending');

COMMIT;



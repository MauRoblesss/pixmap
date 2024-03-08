/*
 * logout
 */

export default async (req, res) => {
  const { user } = req;
  const { t } = req.ttag;
  if (!user || !user.regUser) {
    res.status(401);
    res.json({
      errors: [t`You are not even logged in.`],
    });
    return;
  }

  req.logout((err) => {
    if (err) {
      res.status(500);
      res.json({
        errors: [t`Server error when logging out.`],
      });
      return;
    }
    res.status(200);
    res.json({
      success: true,
    });
  });
};
